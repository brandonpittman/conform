import {
	type Submission,
	type FieldError,
	type FieldConstraint,
	type FormValidate,
	parse as baseParse,
	getName,
	setValue,
	setFormError,
} from '@conform-to/dom';
import * as z from 'zod';

function formatError<Schema>(error: z.ZodError<Schema>): FieldError<Schema> {
	const result: FieldError<Schema> = {};

	for (const issue of error.errors) {
		setValue<string>(
			result,
			issue.path.flatMap((path) => ['details', path]).concat('message'),
			(prev) => (prev ? prev : issue.message),
		);
	}

	return result;
}

export function parse<Schema extends Record<string, any>>(
	payload: FormData | URLSearchParams,
	schema: z.ZodType<Schema>,
): Submission<Schema> {
	const submission = baseParse(payload);
	const result = schema.safeParse(submission.form.value);

	if (submission.state === 'modified') {
		return {
			state: 'modified',
			// @ts-expect-error
			form: submission.form,
		};
	}

	if (result.success) {
		return {
			state: 'accepted',
			data: result.data,
			// @ts-expect-error
			form: submission.form,
		};
	} else {
		return {
			state: 'rejected',
			form: {
				// @ts-expect-error
				value: submission.form.value,
				error: formatError(result.error),
			},
		};
	}
}

export function resolve<Schema extends Record<string, any>>(
	schema: z.ZodType<Schema>,
): FormValidate {
	function validate(form: HTMLFormElement) {
		const payload = new FormData(form);
		const submission = baseParse(payload);
		const result = schema.safeParse(submission.form.value);
		const errors = !result.success
			? result.error.errors.map<[string, string]>((e) => [
					getName(e.path),
					e.message,
			  ])
			: [];

		setFormError(form, errors);
	}

	return validate;
}

export function getConstraint<Schema extends Record<string, any>>(
	schema: z.ZodType<Schema>,
): { [Key in keyof Schema]: FieldConstraint } {
	function getSchemaShape<T extends Record<string, any>>(
		def: z.ZodType<T>,
	): z.ZodRawShape | null {
		if (def instanceof z.ZodObject) {
			return def.shape;
		} else if (def instanceof z.ZodEffects) {
			return getSchemaShape(def.innerType());
		} else if (def instanceof z.ZodOptional) {
			return getSchemaShape(def.unwrap());
		}

		return null;
	}

	function inferConstraint<Schema>(def: z.ZodType<Schema>): FieldConstraint {
		const constraint: FieldConstraint = {
			required: true,
		};

		if (def instanceof z.ZodEffects) {
			return inferConstraint(def.innerType());
		} else if (def instanceof z.ZodOptional) {
			return {
				...inferConstraint(def.unwrap()),
				required: false,
			};
		} else if (def instanceof z.ZodDefault) {
			return {
				...inferConstraint(def.removeDefault()),
				required: false,
			};
		} else if (def instanceof z.ZodArray) {
			return {
				multiple: true,
			};
		} else if (def instanceof z.ZodString) {
			for (let check of def._def.checks) {
				switch (check.kind) {
					case 'min':
						if (!constraint.minLength || constraint.minLength < check.value) {
							constraint.minLength = check.value;
						}
						break;
					case 'max':
						if (!constraint.maxLength || constraint.maxLength > check.value) {
							constraint.maxLength = check.value;
						}
						break;
					case 'regex':
						if (!constraint.pattern) {
							constraint.pattern = check.regex.source;
						}
						break;
				}
			}
		} else if (def instanceof z.ZodNumber) {
			for (let check of def._def.checks) {
				switch (check.kind) {
					case 'min':
						if (!constraint.min || constraint.min < check.value) {
							constraint.min = check.value;
						}
						break;
					case 'max':
						if (!constraint.max || constraint.max > check.value) {
							constraint.max = check.value;
						}
						break;
				}
			}
		} else if (def instanceof z.ZodEnum) {
			constraint.pattern = def.options
				.map((option: string) =>
					// To escape unsafe characters on regex
					option.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d'),
				)
				.join('|');
		}

		return constraint;
	}

	const shape = getSchemaShape(schema);

	if (!shape) {
		throw new Error(
			'Unknown schema provided; The schema must have an object shape',
		);
	}

	// @ts-expect-error
	return Object.fromEntries(
		Object.entries(shape).map(([key, def]) => [key, inferConstraint(def)]),
	);
}
