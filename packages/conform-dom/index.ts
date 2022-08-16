export type Primitive =
	| null
	| undefined
	| string
	| number
	| boolean
	| symbol
	| bigint
	| Date;

export type FieldElement =
	| HTMLInputElement
	| HTMLSelectElement
	| HTMLTextAreaElement
	| HTMLButtonElement;

export interface FieldConfig<Schema = unknown> extends FieldConstraint {
	name: string;
	defaultValue?: FieldValue<Schema>;
	initialError?: FieldError<Schema>['details'];
	form?: string;
}

export type FieldValue<Schema> = Schema extends Primitive | File
	? string
	: Schema extends Array<infer InnerType>
	? Array<FieldValue<InnerType>>
	: Schema extends Record<string, any>
	? { [Key in keyof Schema]?: FieldValue<Schema[Key]> }
	: unknown;

export interface FieldError<Schema> {
	message?: string;
	details?: Schema extends Primitive | File
		? never
		: Schema extends Array<infer InnerType>
		? Array<FieldError<InnerType>>
		: Schema extends Record<string, any>
		? { [Key in keyof Schema]?: FieldError<Schema[Key]> }
		: unknown;
}

export type FieldConstraint = {
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	min?: string | number;
	max?: string | number;
	step?: string;
	multiple?: boolean;
	pattern?: string;
};

export type FieldsetConstraint<Schema extends Record<string, any>> = {
	[Key in keyof Schema]?: FieldConstraint;
};

export interface FormValidate {
	(form: HTMLFormElement, submitter?: HTMLElement | null): void;
}

export interface FormState<Schema extends Record<string, any>> {
	value: FieldValue<Schema>;
	error: FieldError<Schema>;
}

export type Submission<Schema extends Record<string, unknown>> =
	| {
			state: 'modified';
			form: FormState<Schema>;
	  }
	| {
			state: 'rejected';
			form: FormState<Schema>;
	  }
	| {
			state: 'accepted';
			data: Schema;
			form: FormState<Schema>;
	  };

export type ListCommand<Schema> =
	| { type: 'prepend'; payload: { defaultValue: Schema } }
	| { type: 'append'; payload: { defaultValue: Schema } }
	| { type: 'replace'; payload: { defaultValue: Schema; index: number } }
	| { type: 'remove'; payload: { index: number } }
	| { type: 'reorder'; payload: { from: number; to: number } };

export function isFieldElement(element: unknown): element is FieldElement {
	return (
		element instanceof Element &&
		(element.tagName === 'INPUT' ||
			element.tagName === 'SELECT' ||
			element.tagName === 'TEXTAREA' ||
			element.tagName === 'BUTTON')
	);
}

export function getPaths(name?: string): Array<string | number> {
	const pattern = /(\w+)\[(\d+)\]/;

	if (!name) {
		return [];
	}

	return name.split('.').flatMap((key) => {
		const matches = pattern.exec(key);

		if (!matches) {
			return key;
		}

		return [matches[1], Number(matches[2])];
	});
}

export function getFormData(
	form: HTMLFormElement,
	submitter?: HTMLElement | null,
): FormData {
	const payload = new FormData(form);

	if (
		submitter &&
		(submitter instanceof HTMLButtonElement ||
			submitter instanceof HTMLInputElement) &&
		submitter.name
	) {
		payload.append(submitter.name, submitter.value);
	}

	return payload;
}

export function getName(paths: Array<string | number>): string {
	return paths.reduce<string>((name, path) => {
		if (name === '' || path === '') {
			return [name, path].join('');
		}

		if (typeof path === 'number') {
			return `${name}[${path}]`;
		}

		return [name, path].join('.');
	}, '');
}

export function getKey(
	fieldName: string,
	fieldsetName: string = '',
): string | null {
	const name =
		fieldsetName === '' || fieldName.startsWith(fieldsetName)
			? fieldName.slice(fieldsetName ? fieldsetName.length + 1 : 0)
			: '';
	const paths = getPaths(name);

	if (paths.length > 1) {
		return null;
	}

	return typeof paths[0] === 'string' ? paths[0] : null;
}

export function setFormError(
	form: HTMLFormElement,
	errors: Array<[string, string]>,
) {
	const firstErrorByName = Object.fromEntries([...errors].reverse());

	for (const element of form.elements) {
		if (!isFieldElement(element)) {
			continue;
		}

		element.setCustomValidity(firstErrorByName[element.name] ?? '');
	}
}

export function setValue<T>(
	target: any,
	paths: Array<string | number>,
	valueFn: (prev?: T) => T,
): void {
	let length = paths.length;
	let lastIndex = length - 1;
	let index = -1;
	let pointer = target;

	while (pointer != null && ++index < length) {
		let key = paths[index];
		let next = paths[index + 1];
		let newValue =
			index != lastIndex
				? pointer[key] ?? (typeof next === 'number' ? [] : {})
				: valueFn(pointer[key]);

		pointer[key] = newValue;
		pointer = pointer[key];
	}
}

export const commandKey = '__conform__';

export function serializeListCommand<Schema>(
	name: string,
	{ type, payload }: ListCommand<Schema>,
): string {
	return [name, type, JSON.stringify(payload)].join('::');
}

export function parseListCommand<Schema>(
	serialized: string,
): [string, ListCommand<Schema>] {
	const [name, type, json] = serialized.split('::');

	return [name, { type: type as any, payload: JSON.parse(json) }];
}

export function applyListCommand<Type>(
	list: Array<Type>,
	command: ListCommand<Type>,
): Array<Type> {
	switch (command.type) {
		case 'prepend': {
			list.unshift(command.payload.defaultValue);
			break;
		}
		case 'append': {
			list.push(command.payload.defaultValue);
			break;
		}
		case 'replace': {
			list.splice(command.payload.index, 1, command.payload.defaultValue);
			break;
		}
		case 'remove':
			list.splice(command.payload.index, 1);
			break;
		case 'reorder':
			list.splice(
				command.payload.to,
				0,
				...list.splice(command.payload.from, 1),
			);
			break;
		default:
			throw new Error('Invalid list command');
	}

	return list;
}

export function parse(
	payload: FormData | URLSearchParams,
): Submission<Record<string, unknown>> {
	const command = payload.get(commandKey);

	if (command) {
		payload.delete(commandKey);
	}

	let value: Record<string, unknown> = {};

	try {
		for (let [name, entry] of payload.entries()) {
			setValue(value, getPaths(name), (prev) => {
				if (prev) {
					throw new Error('Entry with the same name is not supported');
				}

				if (typeof entry !== 'string') {
					return entry;
				}

				return entry !== '' ? entry : undefined;
			});
		}

		if (command) {
			if (command instanceof File) {
				throw new Error(
					`The "${commandKey}" key could not be used for file upload`,
				);
			}

			const [name, listCommand] = parseListCommand(command);

			let list: any = value;

			for (let path of getPaths(name)) {
				list = list[path];

				if (typeof list === 'undefined') {
					break;
				}
			}

			if (!Array.isArray(list)) {
				throw new Error('The command can only be applied to a list');
			}

			applyListCommand(list, listCommand);

			return {
				state: 'modified',
				form: {
					value,
					error: {},
				},
			};
		}
	} catch (e) {
		return {
			state: 'rejected',
			form: {
				value,
				error: {
					message: e instanceof Error ? e.message : 'Submission failed',
				},
			},
		};
	}

	return {
		state: 'accepted',
		data: value,
		form: {
			value,
			error: {},
		},
	};
}
