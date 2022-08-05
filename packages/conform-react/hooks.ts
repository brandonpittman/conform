import {
	type FieldProps,
	type FieldsetData,
	type FieldsetConfig,
	isFieldElement,
	getKey,
	getControlButtonProps,
	applyControlCommand,
} from '@conform-to/dom';
import {
	type ButtonHTMLAttributes,
	type FormHTMLAttributes,
	type RefObject,
	type ReactElement,
	useRef,
	useState,
	useEffect,
	useMemo,
	createElement,
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

interface FieldsetProps {
	ref: RefObject<HTMLFieldSetElement>;
	name?: string;
	form?: string;
}

export function useFieldset<Type extends Record<string, any>>(
	config: FieldsetConfig<Type> = {},
): [FieldsetProps, { [Key in keyof Type]-?: FieldProps<Type[Key]> }] {
	const ref = useRef<HTMLFieldSetElement>(null);
	const [errorMessage, setErrorMessage] = useState<
		FieldsetData<Record<string, any>, string>
	>(config.error ?? {});

	useEffect(() => {
		const fieldset = ref.current;

		if (!fieldset) {
			console.warn(
				'No fieldset ref found; You must pass the fieldsetProps to the fieldset element',
			);
			return;
		}

		if (!fieldset?.form) {
			console.warn(
				'No form element is linked to the fieldset; Do you forgot setting the form attribute?',
			);
			return;
		}

		const invalidHandler = (event: Event) => {
			const field = event.target;

			if (!isFieldElement(field) || field.form !== fieldset.form) {
				return;
			}

			const key = getKey(field.name, fieldset.name);

			if (key) {
				setErrorMessage((prev) => {
					const prevMessage = prev[key] ?? '';

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
			if (event.target !== fieldset.form) {
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
	}, []);

	useEffect(() => {
		setErrorMessage(config.error ?? {});
	}, [config.error]);

	return [
		{
			ref,
			name: config.name,
			form: config.form,
		},
		new Proxy(config, {
			get(target, key) {
				if (typeof key !== 'string') {
					return;
				}

				const constraint = target.constraint?.[key];
				const props: FieldProps<unknown> = {
					name: target.name ? `${target.name}.${key}` : key,
					form: target.form,
					defaultValue: target.defaultValue?.[key],
					error: errorMessage[key] ?? target.error?.[key],
					...constraint,
				};

				return props;
			},
		}) as { [Key in keyof Type]-?: FieldProps<Type[Key]> },
	];
}

interface FieldListControl<T> {
	prepend(
		defaultValue?: FieldsetData<T, string>,
	): ButtonHTMLAttributes<HTMLButtonElement>;
	append(
		defaultValue?: FieldsetData<T, string>,
	): ButtonHTMLAttributes<HTMLButtonElement>;
	replace(
		index: number,
		defaultValue: FieldsetData<T, string>,
	): ButtonHTMLAttributes<HTMLButtonElement>;
	remove(index: number): ButtonHTMLAttributes<HTMLButtonElement>;
	reorder(
		fromIndex: number,
		toIndex: number,
	): ButtonHTMLAttributes<HTMLButtonElement>;
}

export function useFieldList<Payload>(props: FieldProps<Array<Payload>>): [
	Array<{
		key: string;
		props: FieldProps<Payload>;
	}>,
	FieldListControl<Payload>,
] {
	const [entries, setEntries] = useState<
		Array<[string, FieldsetData<Payload, string> | undefined]>
	>(() => Object.entries(props.defaultValue ?? [undefined]));
	const list = entries.map<{ key: string; props: FieldProps<Payload> }>(
		([key, defaultValue], index) => ({
			key: `${key}`,
			props: {
				...props,
				name: `${props.name}[${index}]`,
				defaultValue: defaultValue ?? props.defaultValue?.[index],
				error: props.error?.[index],
				multiple: false,
			},
		}),
	);
	const control: FieldListControl<Payload> = {
		prepend(defaultValue) {
			return {
				...getControlButtonProps(props.name, 'prepend', {
					defaultValue,
				}),
				onClick(e) {
					setEntries((entries) =>
						applyControlCommand([...entries], 'prepend', {
							defaultValue: [`${Date.now()}`, defaultValue],
						}),
					);
					e.preventDefault();
				},
			};
		},
		append(defaultValue) {
			return {
				...getControlButtonProps(props.name, 'append', {
					defaultValue,
				}),
				onClick(e) {
					setEntries((entries) =>
						applyControlCommand([...entries], 'append', {
							defaultValue: [`${Date.now()}`, defaultValue],
						}),
					);
					e.preventDefault();
				},
			};
		},
		replace(index, defaultValue) {
			return {
				...getControlButtonProps(props.name, 'replace', {
					index,
					defaultValue,
				}),
				onClick(e) {
					setEntries((entries) =>
						applyControlCommand([...entries], 'replace', {
							defaultValue: [`${Date.now()}`, defaultValue],
							index,
						}),
					);
					e.preventDefault();
				},
			};
		},
		remove(index) {
			return {
				...getControlButtonProps(props.name, 'remove', { index }),
				onClick(e) {
					setEntries((entries) =>
						applyControlCommand([...entries], 'remove', {
							index,
						}),
					);
					e.preventDefault();
				},
			};
		},
		reorder(fromIndex, toIndex) {
			return {
				...getControlButtonProps(props.name, 'reorder', {
					from: fromIndex,
					to: toIndex,
				}),
				onClick(e) {
					if (fromIndex !== toIndex) {
						setEntries((entries) =>
							applyControlCommand([...entries], 'reorder', {
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
		setEntries(Object.entries(props.defaultValue ?? [undefined]));
	}, [props.defaultValue]);

	return [list, control];
}

interface InputControl {
	value: string;
	onChange: (value: string) => void;
	onBlur: () => void;
}

export function useControlledInput<
	T extends string | number | Date | undefined,
>(field: FieldProps<T>): [ReactElement, InputControl] {
	const ref = useRef<HTMLInputElement>(null);
	const input = useMemo(
		() =>
			createElement('input', {
				ref,
				name: field.name,
				form: field.form,
				defaultValue: field.defaultValue,
				required: field.required,
				minLength: field.minLength,
				maxLength: field.maxLength,
				min: field.min,
				max: field.max,
				step: field.step,
				pattern: field.pattern,
				hidden: true,
				'aria-hidden': true,
			}),
		[
			field.name,
			field.form,
			field.defaultValue,
			field.required,
			field.minLength,
			field.maxLength,
			field.min,
			field.max,
			field.step,
			field.pattern,
		],
	);

	return [
		input,
		{
			value: ref.current?.value ?? `${field.defaultValue ?? ''}`,
			onChange: (value: string) => {
				if (!ref.current) {
					return;
				}

				ref.current.value = value;
				ref.current.dispatchEvent(new InputEvent('input', { bubbles: true }));
			},
			onBlur: () => {
				ref.current?.dispatchEvent(
					new FocusEvent('focusout', { bubbles: true }),
				);
			},
		},
	];
}
