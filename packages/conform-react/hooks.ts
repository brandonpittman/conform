import {
	type FieldProps,
	type SchemaLike,
	isFieldElement,
	getKey,
	serializeListCommand,
	applyListCommand,
} from '@conform-to/dom';
import {
	type ButtonHTMLAttributes,
	type FormHTMLAttributes,
	type RefObject,
	useRef,
	useState,
	useEffect,
} from 'react';

export interface FormConfig {
	/**
	 * Define when the error should be reported initially.
	 * Support "onSubmit", "onChange", "onBlur".
	 *
	 * Default to `onSubmit`
	 */
	initialReport?: 'onSubmit' | 'onChange' | 'onBlur';

	/**
	 * Enable native validation before hydation.
	 */
	fallbackNative?: boolean;

	/**
	 * Allow the form to be submitted regardless of the form validity.
	 */
	noValidate?: boolean;

	/**
	 * A function to be called when the form should be (re)validated.
	 */
	validate?: (form: HTMLFormElement) => void;

	/**
	 * The submit event handler of the form. It will be called
	 * only when the form is considered valid.
	 */
	onSubmit?: FormHTMLAttributes<HTMLFormElement>['onSubmit'];

	/**
	 * The reset event handler of the form.
	 */
	onReset?: FormHTMLAttributes<HTMLFormElement>['onReset'];
}

interface FormProps {
	ref: RefObject<HTMLFormElement>;
	onSubmit: Required<FormHTMLAttributes<HTMLFormElement>>['onSubmit'];
	onReset: Required<FormHTMLAttributes<HTMLFormElement>>['onReset'];
	noValidate: Required<FormHTMLAttributes<HTMLFormElement>>['noValidate'];
}

export function useForm(config: FormConfig = {}): FormProps {
	const { validate } = config;

	const ref = useRef<HTMLFormElement>(null);
	const [noValidate, setNoValidate] = useState(
		config.noValidate || !config.fallbackNative,
	);

	useEffect(() => {
		setNoValidate(true);
	}, []);

	useEffect(() => {
		const form = ref.current;

		if (!form || config.noValidate) {
			return;
		}

		validate?.(form);

		const handleInput = (event: Event) => {
			const field = event.target;

			if (!isFieldElement(field) || field.form !== form) {
				return;
			}

			validate?.(form);

			if (config.initialReport === 'onChange') {
				field.dataset.conformTouched = 'true';
			}

			for (const field of form.elements) {
				if (isFieldElement(field) && field.dataset.conformTouched) {
					if (field.validity.valid) {
						field.dispatchEvent(new Event('invalid'));
					} else {
						field.reportValidity();
					}
				}
			}
		};
		const handleFocusout = (event: FocusEvent) => {
			const field = event.target;

			if (
				!isFieldElement(field) ||
				field.form !== form ||
				config.initialReport !== 'onBlur'
			) {
				return;
			}

			field.dataset.conformTouched = 'true';
			field.reportValidity();
		};

		document.addEventListener('input', handleInput);
		document.addEventListener('focusout', handleFocusout);

		return () => {
			document.removeEventListener('input', handleInput);
			document.removeEventListener('focusout', handleFocusout);
		};
	}, [validate, config.initialReport, config.noValidate]);

	return {
		ref: ref,
		onSubmit(event) {
			if (!config.noValidate) {
				const form = event.currentTarget;
				const nativeEvent = event.nativeEvent as SubmitEvent;

				for (const field of form.elements) {
					if (isFieldElement(field)) {
						field.dataset.conformTouched = 'true';
					}
				}

				let formNoValidate = false;

				if (
					nativeEvent.submitter instanceof HTMLButtonElement ||
					nativeEvent.submitter instanceof HTMLInputElement
				) {
					formNoValidate = nativeEvent.submitter.formNoValidate;
				}

				if (!formNoValidate && !event.currentTarget.reportValidity()) {
					event.preventDefault();
					return;
				}
			}

			config.onSubmit?.(event);
		},
		onReset(event) {
			const form = event.currentTarget;

			for (const field of form.elements) {
				if (isFieldElement(field)) {
					delete field.dataset.conformTouched;
				}
			}

			config.onReset?.(event);

			setTimeout(() => {
				validate?.(form);
			}, 0);
		},
		noValidate,
	};
}

export function useFieldset<Schema = Record<string, string>>(
	ref: RefObject<HTMLFormElement> | RefObject<HTMLFieldSetElement>,
): { [Key in keyof Schema]-?: FieldProps<Schema[Key]> };
export function useFieldset<Schema extends Record<string, any>>(
	ref: RefObject<HTMLFormElement> | RefObject<HTMLFieldSetElement>,
	config: FieldProps<Schema>,
): { [Key in keyof Schema]-?: FieldProps<Schema[Key]> };
export function useFieldset<Schema extends Record<string, any>>(
	ref: RefObject<HTMLFormElement> | RefObject<HTMLFieldSetElement>,
	config: FieldProps<Schema> = {},
): { [Key in keyof Schema]-?: FieldProps<Schema[Key]> } {
	const [errorMessage, setErrorMessage] = useState<
		SchemaLike<Record<string, any>, string> | undefined
	>(config.error);

	useEffect(() => {
		const anchor = ref.current;
		const form = anchor instanceof HTMLFormElement ? anchor : anchor?.form;

		if (!form) {
			console.warn('No form element is located');
			return;
		}

		const invalidHandler = (event: Event) => {
			const field = event.target;

			if (!isFieldElement(field) || field.form !== form) {
				return;
			}

			const key = getKey(field.name, config.name);

			if (key) {
				setErrorMessage((prev) => {
					const prevMessage = prev?.[key] ?? '';

					if (prevMessage === field.validationMessage) {
						return prev;
					}

					return {
						...prev,
						[key]: field.validationMessage,
					};
				});

				event.preventDefault();
			}
		};
		const resetHandler = (event: Event) => {
			if (event.target !== form) {
				return;
			}

			setErrorMessage({});
		};

		document.addEventListener('invalid', invalidHandler, true);
		document.addEventListener('reset', resetHandler);

		return () => {
			document.removeEventListener('invalid', invalidHandler, true);
			document.removeEventListener('reset', resetHandler);
		};
	}, [ref, config.name]);

	useEffect(() => {
		setErrorMessage(config.error);
	}, [config.error]);

	return new Proxy(config, {
		get(target, key) {
			if (typeof key !== 'string') {
				return;
			}

			const constraint = target.constraint?.[key];
			const props: FieldProps<unknown> = {
				name: target.name ? `${target.name}.${key}` : key,
				form: target.form,
				defaultValue: target.defaultValue?.[key],
				error: errorMessage?.[key] ?? target.error?.[key],
				constraint,
			};

			return props;
		},
	}) as { [Key in keyof Schema]-?: FieldProps<Schema[Key]> };
}

interface FieldListControl<Schema> {
	prepend(
		defaultValue?: SchemaLike<Schema, string>,
	): ButtonHTMLAttributes<HTMLButtonElement>;
	append(
		defaultValue?: SchemaLike<Schema, string>,
	): ButtonHTMLAttributes<HTMLButtonElement>;
	replace(
		index: number,
		defaultValue: SchemaLike<Schema, string>,
	): ButtonHTMLAttributes<HTMLButtonElement>;
	remove(index: number): ButtonHTMLAttributes<HTMLButtonElement>;
	reorder(
		fromIndex: number,
		toIndex: number,
	): ButtonHTMLAttributes<HTMLButtonElement>;
}

export function useFieldList<Payload>(props?: FieldProps<Array<Payload>>): [
	Array<{
		key: string;
		props: FieldProps<Payload>;
	}>,
	FieldListControl<Payload>,
] {
	const [entries, setEntries] = useState<
		Array<[string, SchemaLike<Payload, string> | undefined]>
	>(() => Object.entries(props?.defaultValue ?? [undefined]));
	const list = entries.map<{ key: string; props: FieldProps<Payload> }>(
		([key, defaultValue], index) => ({
			key: `${key}`,
			props: {
				...props,
				name: props?.name ? `${props.name}[${index}]` : '',
				defaultValue: defaultValue ?? props?.defaultValue?.[index],
				error: props?.error?.[index],
			},
		}),
	);
	const control: FieldListControl<Payload> = {
		prepend(defaultValue) {
			const [name, value] = props?.name
				? serializeListCommand(props.name, {
						type: 'prepend',
						defaultValue,
				  })
				: [];

			return {
				name,
				value,
				formNoValidate: true,
				onClick(e) {
					setEntries((entries) =>
						applyListCommand([...entries], {
							type: 'prepend',
							defaultValue: [`${Date.now()}`, defaultValue],
						}),
					);
					e.preventDefault();
				},
			};
		},
		append(defaultValue) {
			const [name, value] = props?.name
				? serializeListCommand(props.name, {
						type: 'append',
						defaultValue,
				  })
				: [];

			return {
				name,
				value,
				formNoValidate: true,
				onClick(e) {
					setEntries((entries) =>
						applyListCommand([...entries], {
							type: 'append',
							defaultValue: [`${Date.now()}`, defaultValue],
						}),
					);
					e.preventDefault();
				},
			};
		},
		replace(index, defaultValue) {
			const [name, value] = props?.name
				? serializeListCommand(props.name, {
						type: 'replace',
						index,
						defaultValue,
				  })
				: [];

			return {
				name,
				value,
				formNoValidate: true,
				onClick(e) {
					setEntries((entries) =>
						applyListCommand([...entries], {
							type: 'replace',
							defaultValue: [`${Date.now()}`, defaultValue],
							index,
						}),
					);
					e.preventDefault();
				},
			};
		},
		remove(index) {
			const [name, value] = props?.name
				? serializeListCommand(props.name, {
						type: 'remove',
						index,
				  })
				: [];

			return {
				name,
				value,
				formNoValidate: true,
				onClick(e) {
					setEntries((entries) =>
						applyListCommand([...entries], {
							type: 'remove',
							index,
						}),
					);
					e.preventDefault();
				},
			};
		},
		reorder(fromIndex, toIndex) {
			const [name, value] = props?.name
				? serializeListCommand(props.name, {
						type: 'reorder',
						from: fromIndex,
						to: toIndex,
				  })
				: [];

			return {
				name,
				value,
				formNoValidate: true,
				onClick(e) {
					if (fromIndex !== toIndex) {
						setEntries((entries) =>
							applyListCommand([...entries], {
								type: 'reorder',
								from: fromIndex,
								to: toIndex,
							}),
						);
					}

					e.preventDefault();
				},
			};
		},
	};

	useEffect(() => {
		setEntries(Object.entries(props?.defaultValue ?? [undefined]));
	}, [props?.defaultValue]);

	return [list, control];
}

interface InputControl {
	value: string;
	required?: boolean;
	onChange: (value: string) => void;
	onBlur: () => void;
}

export function useShadowInput<
	Schema extends string | number | Date | undefined,
>(
	field?: Pick<FieldProps<Schema>, 'defaultValue'>,
): [RefObject<HTMLInputElement>, InputControl] {
	const ref = useRef<HTMLInputElement>(null);
	const [value, setValue] = useState<string>(field?.defaultValue ?? '');

	return [
		ref,
		{
			value,
			onChange: (value: string) => {
				if (!ref.current) {
					return;
				}

				ref.current.value = value;
				ref.current.dispatchEvent(new InputEvent('input', { bubbles: true }));
				setValue(value);
			},
			onBlur: () => {
				ref.current?.dispatchEvent(
					new FocusEvent('focusout', { bubbles: true }),
				);
			},
		},
	];
}
