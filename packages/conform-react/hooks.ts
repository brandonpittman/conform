import {
	type FieldElement,
	type FieldConfig,
	type FormValidate,
	type SchemaLike,
	isFieldElement,
	getKey,
	serializeListCommand,
	applyListCommand,
} from '@conform-to/dom';
import {
	type ChangeEvent,
	type FormHTMLAttributes,
	type FormEvent,
	type InputHTMLAttributes,
	type MouseEvent,
	type RefObject,
	useRef,
	useState,
	useEffect,
} from 'react';
import { input } from './helpers';

interface FormConfig {
	ref: RefObject<HTMLFormElement>;
	onSubmit: Required<FormHTMLAttributes<HTMLFormElement>>['onSubmit'];
	noValidate: Required<FormHTMLAttributes<HTMLFormElement>>['noValidate'];
}

export function useForm(
	options: {
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
		validate?: FormValidate;

		/**
		 * The submit event handler of the form. It will be called
		 * only when the form is considered valid.
		 */
		onSubmit?: FormHTMLAttributes<HTMLFormElement>['onSubmit'];
	} = {},
): FormConfig {
	const { validate } = options;

	const ref = useRef<HTMLFormElement>(null);
	const [noValidate, setNoValidate] = useState(
		options.noValidate || !options.fallbackNative,
	);

	useEffect(() => {
		setNoValidate(true);
	}, []);

	useEffect(() => {
		if (options.noValidate) {
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

			if (options.initialReport === 'onChange') {
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
				options.initialReport !== 'onBlur'
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
	}, [validate, options.initialReport, options.noValidate]);

	return {
		ref,
		noValidate,
		onSubmit(event) {
			if (!options.noValidate) {
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

			options.onSubmit?.(event);
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
): { [Key in keyof Schema]-?: FieldConfig<Schema[Key]> };
export function useFieldset<Schema extends Record<string, any>>(
	ref: RefObject<HTMLFormElement> | RefObject<HTMLFieldSetElement>,
	config: FieldConfig<Schema>,
): { [Key in keyof Schema]-?: FieldConfig<Schema[Key]> };
export function useFieldset<Schema extends Record<string, any>>(
	ref: RefObject<HTMLFormElement> | RefObject<HTMLFieldSetElement>,
	config: FieldConfig<Schema> = {},
): { [Key in keyof Schema]-?: FieldConfig<Schema[Key]> } {
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

				return {
					name: config.name ? `${config.name}.${key}` : key,
					form: config.form,
					defaultValue: config.defaultValue?.[key],
					error: errorMessage?.[key] ?? config.error?.[key],
					constraint: config.constraint?.[key],
				};
			},
		},
	) as { [Key in keyof Schema]-?: FieldConfig<Schema[Key]> };
}

interface ControlButtonProps {
	name?: string;
	value?: string;
	form?: string;
	formNoValidate: true;
	onClick(event?: MouseEvent<HTMLButtonElement>): void;
}

interface ListControl<Schema> {
	prepend(defaultValue?: SchemaLike<Schema, string>): ControlButtonProps;
	append(defaultValue?: SchemaLike<Schema, string>): ControlButtonProps;
	replace(
		index: number,
		defaultValue: SchemaLike<Schema, string>,
	): ControlButtonProps;
	remove(index: number): ControlButtonProps;
	reorder(fromIndex: number, toIndex: number): ControlButtonProps;
}

export function useListControl<Payload = any>(
	ref: RefObject<HTMLFormElement> | RefObject<HTMLFieldSetElement>,
	config?: FieldConfig<Array<Payload>>,
): [
	Array<{
		key: string;
		config: FieldConfig<Payload>;
	}>,
	ListControl<Payload>,
] {
	const [entries, setEntries] = useState<
		Array<[string, SchemaLike<Payload, string> | undefined]>
	>(() => Object.entries(config?.defaultValue ?? [undefined]));
	const list = entries.map<{ key: string; config: FieldConfig<Payload> }>(
		([key, defaultValue], index) => ({
			key: `${key}`,
			config: {
				...config,
				name: config?.name ? `${config.name}[${index}]` : '',
				defaultValue: defaultValue ?? config?.defaultValue?.[index],
				error: config?.error?.[index],
			},
		}),
	);
	const control: ListControl<Payload> = {
		prepend(defaultValue) {
			const [name, value] = config?.name
				? serializeListCommand(config.name, {
						type: 'prepend',
						defaultValue,
				  })
				: [];

			return {
				name,
				value,
				form: config?.form,
				formNoValidate: true,
				onClick(event) {
					setEntries((entries) =>
						applyListCommand([...entries], {
							type: 'prepend',
							defaultValue: [`${Date.now()}`, defaultValue],
						}),
					);
					event?.preventDefault();
				},
			};
		},
		append(defaultValue) {
			const [name, value] = config?.name
				? serializeListCommand(config.name, {
						type: 'append',
						defaultValue,
				  })
				: [];

			return {
				name,
				value,
				form: config?.form,
				formNoValidate: true,
				onClick(event) {
					setEntries((entries) =>
						applyListCommand([...entries], {
							type: 'append',
							defaultValue: [`${Date.now()}`, defaultValue],
						}),
					);
					event?.preventDefault();
				},
			};
		},
		replace(index, defaultValue) {
			const [name, value] = config?.name
				? serializeListCommand(config.name, {
						type: 'replace',
						index,
						defaultValue,
				  })
				: [];

			return {
				name,
				value,
				form: config?.form,
				formNoValidate: true,
				onClick(event) {
					setEntries((entries) =>
						applyListCommand([...entries], {
							type: 'replace',
							defaultValue: [`${Date.now()}`, defaultValue],
							index,
						}),
					);
					event?.preventDefault();
				},
			};
		},
		remove(index) {
			const [name, value] = config?.name
				? serializeListCommand(config.name, {
						type: 'remove',
						index,
				  })
				: [];

			return {
				name,
				value,
				form: config?.form,
				formNoValidate: true,
				onClick(event) {
					setEntries((entries) =>
						applyListCommand([...entries], {
							type: 'remove',
							index,
						}),
					);
					event?.preventDefault();
				},
			};
		},
		reorder(fromIndex, toIndex) {
			const [name, value] = config?.name
				? serializeListCommand(config.name, {
						type: 'reorder',
						from: fromIndex,
						to: toIndex,
				  })
				: [];

			return {
				name,
				value,
				form: config?.form,
				formNoValidate: true,
				onClick(event) {
					if (fromIndex !== toIndex) {
						setEntries((entries) =>
							applyListCommand([...entries], {
								type: 'reorder',
								from: fromIndex,
								to: toIndex,
							}),
						);
					}

					event?.preventDefault();
				},
			};
		},
	};

	useEffect(() => {
		setEntries(Object.entries(config?.defaultValue ?? [undefined]));

		const resetHandler = (event: Event) => {
			const form = getForm(ref);

			if (!form || event.target !== form) {
				return;
			}

			setEntries(Object.entries(config?.defaultValue ?? []));
		};

		document.addEventListener('reset', resetHandler);

		return () => {
			document.removeEventListener('reset', resetHandler);
		};
	}, [ref, config?.defaultValue]);

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
>(field?: FieldConfig<Schema>): [InputProps, InputControl] {
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
