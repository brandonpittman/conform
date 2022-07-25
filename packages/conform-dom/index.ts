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

export type Schema<Type extends Record<string, any>> = {
	fields: { [Key in keyof Type]-?: Constraint };
	validate?: (element: FieldsetElement) => void;
};

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
 * Element that maintains a list of fields
 * i.e. fieldset.elements
 */
export type FieldsetElement = HTMLFormElement | HTMLFieldSetElement;

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

export function isFieldsetElement(
	element: unknown,
): element is FieldsetElement {
	return (
		element instanceof Element &&
		(element.tagName === 'FORM' || element.tagName === 'FIELDSET')
	);
}

export function isFieldElement(element: unknown): element is FieldElement {
	return (
		element instanceof Element &&
		(element.tagName === 'INPUT' ||
			element.tagName === 'SELECT' ||
			element.tagName === 'TEXTAREA' ||
			element.tagName === 'BUTTON')
	);
}

export function setFieldState(
	field: unknown,
	state: { touched: boolean },
): void {
	if (isFieldsetElement(field)) {
		for (let element of field.elements) {
			setFieldState(element, state);
		}
		return;
	}

	if (!isFieldElement(field)) {
		console.warn('Only input/select/textarea/button element can be touched');
		return;
	}

	if (state.touched) {
		field.dataset.touched = 'true';
	} else {
		delete field.dataset.touched;
	}
}

export function reportValidity(fieldset: FieldsetElement): boolean {
	let isValid = true;

	for (const field of fieldset.elements) {
		if (
			isFieldElement(field) &&
			field.dataset.touched &&
			!field.checkValidity()
		) {
			isValid = false;
		}
	}

	return isValid;
}

export function getFieldProps<Type extends Record<string, any>>(
	schema: Schema<Type>,
	options: {
		name?: string;
		form?: string;
		defaultValue?: FieldsetData<Type, string>;
		error?: FieldsetData<Type, string>;
	},
): { [Key in keyof Type]-?: FieldProps<Type[Key]> } {
	const result: { [Key in keyof Type]-?: FieldProps<Type[Key]> } = {} as any;

	for (const key of Object.keys(schema.fields)) {
		const constraint = schema.fields[key];
		const props: FieldProps<any> = {
			name: options.name ? `${options.name}.${key}` : key,
			form: options.form,
			defaultValue: options.defaultValue?.[key],
			error: options.error?.[key],
			...constraint,
		};

		result[key as keyof Type] = props;
	}

	return result;
}

export function shouldSkipValidate(event: SubmitEvent): boolean {
	if (
		event.submitter?.tagName === 'BUTTON' ||
		event.submitter?.tagName === 'INPUT'
	) {
		return (event.submitter as HTMLButtonElement | HTMLInputElement)
			.formNoValidate;
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

export function transform(
	entries:
		| Array<[string, FormDataEntryValue]>
		| Iterable<[string, FormDataEntryValue]>,
): Record<string, unknown> {
	const result: any = {};

	for (let [key, value] of entries) {
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

export function getFieldElements(
	fieldset: FieldsetElement,
	key: string,
): FieldElement[] {
	const name = getName([fieldset.name ?? '', key]);
	const item = fieldset.elements.namedItem(name);
	const nodes =
		item instanceof RadioNodeList
			? Array.from(item)
			: item !== null
			? [item]
			: [];

	return nodes.filter(isFieldElement);
}

export function registerFieldset<T extends Record<string, unknown>>(
	fieldset: HTMLFieldSetElement,
	schema: Schema<T>,
) {
	if (!fieldset?.form) {
		console.warn(
			'No form element is linked to the fieldset; Do you forgot setting the form attribute?',
		);
	}

	const validateFieldset = () => {
		schema.validate?.(fieldset);

		for (const element of fieldset.elements) {
			if (
				isFieldElement(element) &&
				element.dataset.conformError &&
				element.validationMessage !== element.dataset.conformError
			) {
				delete element.dataset.conformError;
			}
		}
	};

	const resetFieldset = (e: Event) => {
		if (e.target !== fieldset.form) {
			return;
		}

		for (const element of fieldset.elements) {
			if (isFieldElement(element)) {
				delete element.dataset.conformError;
			}
		}

		// Revalidate the fieldset
		schema.validate?.(fieldset);
	};

	validateFieldset();

	document.addEventListener('input', validateFieldset);
	document.addEventListener('reset', resetFieldset);

	return () => {
		document.removeEventListener('input', validateFieldset);
		document.removeEventListener('reset', resetFieldset);
	};
}

export function watchFieldset(
	fieldset: HTMLFieldSetElement,
	initialReport: 'onSubmit' | 'onBlur' | 'onChange' = 'onSubmit',
) {
	const inputHandler = (event: Event) => {
		console.log('report input');

		if (
			!isFieldElement(event.target) ||
			event.target?.form !== fieldset?.form
		) {
			return;
		}

		if (initialReport === 'onChange') {
			setFieldState(event.target, { touched: true });
		}

		reportValidity(fieldset);
	};
	const focusoutHandler = (event: FocusEvent) => {
		if (
			!isFieldElement(event.target) ||
			event.target?.form !== fieldset?.form
		) {
			return;
		}

		if (initialReport === 'onBlur') {
			setFieldState(event.target, { touched: true });
		}

		reportValidity(fieldset);
	};
	const clickHandler = (event: MouseEvent) => {
		if (
			!isFieldElement(event.target) ||
			event.target?.form !== fieldset?.form
		) {
			return;
		}

		if (event.target.type === 'submit') {
			setFieldState(event.target.form, { touched: true });
		}
	};
	const handleReset = (event: Event) => {
		setFieldState(event.currentTarget, { touched: false });
	};

	document.addEventListener('input', inputHandler);
	document.addEventListener('focusout', focusoutHandler);
	document.addEventListener('click', clickHandler);
	document.addEventListener('reset', handleReset);

	return () => {
		document.removeEventListener('input', inputHandler);
		document.removeEventListener('focusout', focusoutHandler);
		document.removeEventListener('click', clickHandler);
		document.removeEventListener('reset', handleReset);
	};
}
