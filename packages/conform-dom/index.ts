export type Constraint = {
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	min?: string | number;
	max?: string | number;
	step?: string;
	multiple?: boolean;
	pattern?: string;
};

export interface FieldProps<Type = any> extends Constraint {
	name: string;
	defaultValue?: FieldsetData<Type, string>;
	error?: FieldsetData<Type, string>;
	form?: string;
}

export interface FormValidate {
	(form: HTMLFormElement): void;
}

/**
 * Data structure of the form value
 */
export type FieldsetData<Type, Value> = Type extends
	| string
	| number
	| Date
	| boolean
	| undefined
	? Value
	: Type extends Array<infer InnerType>
	? Array<FieldsetData<InnerType, Value>>
	: Type extends Object
	? { [Key in keyof Type]?: FieldsetData<Type[Key], Value> }
	: unknown;

/**
 * Element type that might be a candiate of Constraint Validation
 */
export type FieldElement =
	| HTMLInputElement
	| HTMLSelectElement
	| HTMLTextAreaElement
	| HTMLButtonElement;

export interface FormState<T> {
	value: FieldsetData<T, string>;
	error: FieldsetData<T, string>;
}

export type Submission<T extends Record<string, unknown>> =
	| {
			state: 'modified';
			form: FormState<T>;
	  }
	| {
			state: 'rejected';
			form: FormState<T>;
	  }
	| {
			state: 'accepted';
			data: T;
			form: FormState<T>;
	  };

export interface ControlButtonProps {
	type: 'submit';
	name: string;
	value: string;
	formNoValidate: boolean;
}

export interface ControlAction<T = unknown> {
	prepend: { defaultValue: T };
	append: { defaultValue: T };
	replace: { defaultValue: T; index: number };
	remove: { index: number };
	reorder: { from: number; to: number };
}

export type FieldsetConstraint<T> = { [K in keyof T]?: Constraint };

export interface FieldsetConfig<Type>
	extends Partial<
		Pick<FieldProps<Type>, 'name' | 'form' | 'defaultValue' | 'error'>
	> {
	constraint?: FieldsetConstraint<Type>;
}

export function isFieldElement(element: unknown): element is FieldElement {
	return (
		element instanceof Element &&
		(element.tagName === 'INPUT' ||
			element.tagName === 'SELECT' ||
			element.tagName === 'TEXTAREA')
	);
}

export function getFieldProps<Type extends Record<string, any>>(
	config: FieldsetConfig<Type>,
): { [Key in keyof Type]-?: FieldProps<Type[Key]> } {
	return new Proxy({} as { [Key in keyof Type]-?: FieldProps<Type[Key]> }, {
		get(_target, key) {
			if (typeof key !== 'string') {
				return;
			}

			const constraint = config.constraint?.[key];
			const props: FieldProps<any> = {
				name: config.name ? `${config.name}.${key}` : key,
				form: config.form,
				defaultValue: config.defaultValue?.[key],
				error: config.error?.[key],
				...constraint,
			};

			return props;
		},
	});
}

export function isFormNoValidate(event: SubmitEvent): boolean {
	if (
		event.submitter instanceof HTMLButtonElement ||
		event.submitter instanceof HTMLInputElement
	) {
		return event.submitter.formNoValidate;
	}

	return false;
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
	fieldset: HTMLFieldSetElement,
	element: FieldElement,
): string | null {
	if (fieldset.form !== element.form) {
		return null;
	}

	const name =
		fieldset.name === '' || element.name.startsWith(fieldset.name)
			? element.name.slice(fieldset.name ? fieldset.name.length + 1 : 0)
			: '';
	const [key] = getPaths(name);

	return typeof key === 'string' ? key : null;
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

export function transform(
	entries:
		| Array<[string, FormDataEntryValue]>
		| Iterable<[string, FormDataEntryValue]>,
): Record<string, unknown> {
	const result: any = {};

	for (let [key, value] of entries) {
		if (value === '') {
			continue;
		}

		let paths = getPaths(key);
		let length = paths.length;
		let lastIndex = length - 1;
		let index = -1;
		let pointer = result;

		while (pointer != null && ++index < length) {
			let key = paths[index];
			let next = paths[index + 1];
			let newValue = value;

			if (index != lastIndex) {
				newValue = pointer[key] ?? (typeof next === 'number' ? [] : {});
			}

			// if (typeof pointer[key] !== 'undefined') {
			// 	pointer[key] = Array.isArray(pointer[key])
			// 		? pointer[key].concat(newValue)
			// 		: [pointer[key], newValue];
			// } else {
			pointer[key] = newValue;
			// }

			pointer = pointer[key];
		}
	}

	return result;
}

export function getControlButtonProps<
	Action extends keyof ControlAction,
	Payload extends ControlAction[Action],
>(name: string, action: Action, payload: Payload): ControlButtonProps {
	return {
		type: 'submit',
		name: '__conform__',
		value: [name, action, JSON.stringify(payload)].join('::'),
		formNoValidate: true,
	};
}

export function applyControlCommand<
	Type,
	Action extends keyof ControlAction<Type>,
	Payload extends ControlAction<Type>[Action],
>(list: Array<Type>, action: Action | string, payload: Payload): Array<Type> {
	switch (action) {
		case 'prepend': {
			const { defaultValue } = payload as ControlAction<Type>['prepend'];
			list.unshift(defaultValue);
			break;
		}
		case 'append': {
			const { defaultValue } = payload as ControlAction<Type>['append'];
			list.push(defaultValue);
			break;
		}
		case 'replace': {
			const { defaultValue, index } = payload as ControlAction<Type>['replace'];
			list.splice(index, 1, defaultValue);
			break;
		}
		case 'remove':
			const { index } = payload as ControlAction<Type>['remove'];
			list.splice(index, 1);
			break;
		case 'reorder':
			const { from, to } = payload as ControlAction<Type>['reorder'];
			list.splice(to, 0, ...list.splice(from, 1));
			break;
		default:
			throw new Error('Invalid action found');
	}

	return list;
}

export function parse(
	payload: FormData | URLSearchParams,
): Submission<Record<string, unknown>> {
	const command = payload.get('__conform__');

	if (command) {
		payload.delete('__conform__');
	}

	const value = transform(payload.entries());

	if (command) {
		try {
			if (command instanceof File) {
				throw new Error(
					'The __conform__ key is reserved for special command and could not be used for file upload.',
				);
			}

			const [name, action, json] = command.split('::');

			let list: any = value;

			for (let path of getPaths(name)) {
				list = list[path];

				if (typeof list === 'undefined') {
					break;
				}
			}

			if (!Array.isArray(list)) {
				throw new Error('');
			}

			applyControlCommand(list, action, JSON.parse(json));
		} catch (e) {
			return {
				state: 'rejected',
				form: {
					value,
					error: {
						__conform__:
							e instanceof Error ? e.message : 'Something went wrong',
					},
				},
			};
		}

		return {
			state: 'modified',
			form: {
				value,
				error: {},
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
