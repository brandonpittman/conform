import {
	type Constraint,
	type Submission,
	type FieldsetData,
	type FieldsetConstraint,
	type FormValidate,
	parse as baseParse,
	transform,
	getName,
	setFormError,
} from '@conform-to/dom';
import * as z from 'zod';

export function parse<T extends Record<string, unknown>>(
	payload: FormData | URLSearchParams,
	schema: z.ZodType<T>,
): Submission<T> {
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
			// @ts-expect-error
			form: {
				...submission.form,
				error: {
					...submission.form.error,
					...(transform(
						result.error.errors.map((e) => [getName(e.path), e.message]),
					) as FieldsetData<T, string>),
				},
			},
		};
	}
}

export function resolve<T extends Record<string, any>>(
	schema: z.ZodType<T>,
): FormValidate {
	function validate(form: HTMLFormElement) {
		const data = new FormData(form);
		const value = transform(data);
		const result = schema.safeParse(value);
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

export function getConstraint<T extends Record<string, any>>(
	schema: z.ZodType<T>,
): FieldsetConstraint<T> {
	function getSchemaShape<T extends Record<string, any>>(
		schema: z.ZodType<T>,
	): z.ZodRawShape | null {
		if (schema instanceof z.ZodObject) {
			return schema.shape;
		} else if (schema instanceof z.ZodEffects) {
			return getSchemaShape(schema.innerType());
		} else if (schema instanceof z.ZodOptional) {
			return getSchemaShape(schema.unwrap());
		}

		return null;
	}

	function inferConstraint<T>(schema: z.ZodType<T>): Constraint {
		const constraint: Constraint = {
			required: true,
		};

		if (schema instanceof z.ZodEffects) {
			return inferConstraint(schema.innerType());
		} else if (schema instanceof z.ZodOptional) {
			return {
				...inferConstraint(schema.unwrap()),
				required: false,
			};
		} else if (schema instanceof z.ZodDefault) {
			return {
				...inferConstraint(schema.removeDefault()),
				required: false,
			};
		} else if (schema instanceof z.ZodArray) {
			return {
				...inferConstraint(schema.element),
				multiple: true,
			};
		} else if (schema instanceof z.ZodString) {
			for (let check of schema._def.checks) {
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
		} else if (schema instanceof z.ZodNumber) {
			for (let check of schema._def.checks) {
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
		} else if (schema instanceof z.ZodEnum) {
			constraint.pattern = schema.options
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
