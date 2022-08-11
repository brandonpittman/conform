import {
	type FieldElement,
	type FieldProps,
	type SchemaLike,
	isFieldElement,
	getKey,
	serializeListCommand,
	applyListCommand,
} from '@conform-to/dom';
import {
	type ButtonHTMLAttributes,
	type ChangeEvent,
	type FormHTMLAttributes,
	type FormEvent,
	type InputHTMLAttributes,
	type RefObject,
	useRef,
	useState,
	useEffect,
} from 'react';
import { input } from './helpers';

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
}

interface FormProps {
	ref: RefObject<HTMLFormElement>;
	onSubmit: Required<FormHTMLAttributes<HTMLFormElement>>['onSubmit'];
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
		if (config.noValidate) {
			return;
		}

		if (ref.current) {
			validate?.(ref.current);
		}

		const handleInput = (event: Event) => {
			const field = event.target;
			const form = ref.current;

			if (!form || !isFieldElement(field) || field.form !== form) {
				return;
			}

			validate?.(form);

			if (config.initialReport === 'onChange') {
				field.dataset.conformTouched = 'true';
			}

			for (const field of form.elements) {
				if (isFieldElement(field) && field.dataset.conformTouched) {
					field.reportValidity();
				}
			}
		};
		const handleFocusout = (event: FocusEvent) => {
			const field = event.target;
			const form = ref.current;

			if (
				!form ||
				!isFieldElement(field) ||
				field.form !== form ||
				config.initialReport !== 'onBlur'
			) {
				return;
			}

			validate?.(form);
			field.dataset.conformTouched = 'true';
			field.reportValidity();
		};
		const handleReset = (event: Event) => {
			const form = ref.current;

			if (!form || event.target !== form) {
				return;
			}

			for (const field of form.elements) {
				if (isFieldElement(field)) {
					delete field.dataset.conformTouched;
				}
			}

			setTimeout(() => {
				validate?.(form);
			}, 0);
		};

		document.addEventListener('input', handleInput, true);
		document.addEventListener('focusout', handleFocusout);
		document.addEventListener('reset', handleReset);

		return () => {
			document.removeEventListener('input', handleInput, true);
			document.removeEventListener('focusout', handleFocusout);
			document.removeEventListener('reset', handleReset);
		};
	}, [validate, config.initialReport, config.noValidate]);

	return {
		ref,
		noValidate,
		onSubmit(event) {
			if (!config.noValidate) {
				const form = event.currentTarget;
				const nativeEvent = event.nativeEvent as SubmitEvent;

				validate?.(form);

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
	};
}

function getForm(
	ref: RefObject<HTMLFormElement> | RefObject<HTMLFieldSetElement>,
): HTMLFormElement | null {
	const anchor = ref.current;
	const form = anchor instanceof HTMLFormElement ? anchor : anchor?.form;

	if (!form) {
		console.warn('No form element is located');
		return null;
	}

	return form;
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
		const handleInput = (event: Event) => {
			const form = getForm(ref);
			const field = event.target;

			if (!form || !isFieldElement(field) || field.form !== form) {
				return;
			}

			setErrorMessage((prev) => {
				let next = prev;

				for (const field of form.elements) {
					if (isFieldElement(field)) {
						const key = getKey(field.name, config.name);

						if (key) {
							const prevMessage = next?.[key] ?? '';
							const nextMessage = field.validationMessage;

							if (prevMessage !== '' && prevMessage !== nextMessage) {
								next = {
									...next,
									[key]: nextMessage,
								};
							}
						}
					}
				}

				return next;
			});
		};
		const invalidHandler = (event: Event) => {
			const form = getForm(ref);
			const field = event.target;

			if (!form || !isFieldElement(field) || field.form !== form) {
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
			const form = getForm(ref);

			if (!form || event.target !== form) {
				return;
			}

			setErrorMessage({});
		};

		document.addEventListener('input', handleInput);
		document.addEventListener('invalid', invalidHandler, true);
		document.addEventListener('reset', resetHandler);

		return () => {
			document.removeEventListener('input', handleInput);
			document.removeEventListener('invalid', invalidHandler, true);
			document.removeEventListener('reset', resetHandler);
		};
	}, [ref, config.name]);

	useEffect(() => {
		setErrorMessage(config.error);
	}, [config.error]);

	return new Proxy(
		{},
		{
			get(_target, key) {
				if (typeof key !== 'string') {
					return;
				}

				const constraint = config.constraint?.[key];
				const props: FieldProps<unknown> = {
					name: config.name ? `${config.name}.${key}` : key,
					form: config.form,
					defaultValue: config.defaultValue?.[key],
					error: errorMessage?.[key] ?? config.error?.[key],
					constraint,
				};

				return props;
			},
		},
	) as { [Key in keyof Schema]-?: FieldProps<Schema[Key]> };
}

interface ListControl<Schema> {
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

export function useListControl<Payload = any>(
	ref: RefObject<HTMLFormElement> | RefObject<HTMLFieldSetElement>,
	props?: FieldProps<Array<Payload>>,
): [
	Array<{
		key: string;
		props: FieldProps<Payload>;
	}>,
	ListControl<Payload>,
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
	const control: ListControl<Payload> = {
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
				form: props?.form,
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
				form: props?.form,
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
				form: props?.form,
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
				form: props?.form,
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
				form: props?.form,
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

		const resetHandler = (event: Event) => {
			const form = getForm(ref);

			if (!form || event.target !== form) {
				return;
			}

			setEntries(Object.entries(props?.defaultValue ?? []));
		};

		document.addEventListener('reset', resetHandler);

		return () => {
			document.removeEventListener('reset', resetHandler);
		};
	}, [ref, props?.defaultValue]);

	return [list, control];
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	ref: RefObject<HTMLInputElement>;
}

interface InputControl {
	value: string;
	onChange: (eventOrvalue: ChangeEvent<FieldElement> | string) => void;
	onBlur: () => void;
	onInvalid: (event: FormEvent<FieldElement>) => void;
}

export function useInputControl<
	Schema extends string | number | Date | undefined,
>(field?: FieldProps<Schema>): [InputProps, InputControl] {
	const ref = useRef<HTMLInputElement>(null);
	const [value, setValue] = useState<string>(field?.defaultValue ?? '');
	const handleChange: InputControl['onChange'] = (eventOrvalue) => {
		if (!ref.current) {
			return;
		}

		const value =
			typeof eventOrvalue === 'string'
				? eventOrvalue
				: eventOrvalue.target.value;

		ref.current.value = value;
		ref.current.dispatchEvent(new InputEvent('input', { bubbles: true }));
		setValue(value);
	};
	const handleBlur: InputControl['onBlur'] = () => {
		ref.current?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
	};
	const handleInvalid: InputControl['onInvalid'] = (event) => {
		event.preventDefault();
	};

	return [
		{
			ref,
			hidden: true,
			...input(field ?? {}, { type: 'text' }),
		},
		{
			value,
			onChange: handleChange,
			onBlur: handleBlur,
			onInvalid: handleInvalid,
		},
	];
}
