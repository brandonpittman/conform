import {
	type FieldProps,
	type FieldsetData,
	type FieldsetConfig,
	isFieldElement,
	isFormNoValidate,
	getFieldProps,
	getKey,
	getControlButtonProps,
	applyControlCommand,
} from '@conform-to/dom';
import {
	type ButtonHTMLAttributes,
	type FormEvent,
	type FormEventHandler,
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
	 * Decide when the error should be reported initially.
	 * Default to `onSubmit`
	 */
	initialReport?: 'onSubmit' | 'onChange' | 'onBlur';

	/**
	 * Native browser report will be used before hydation if it is set to `true`.
	 * Default to `false`
	 */
	fallbackNative?: boolean;

	/**
	 * The form could be submitted even if there is invalid input control if it is set to `true`.
	 * Default to `false`
	 */
	noValidate?: boolean;

	/**
	 *
	 */
	validate?: (form: HTMLFormElement) => void;

	/**
	 * The submit handler will be triggered only when the form is valid.
	 * Or when noValidate is set to `true`
	 */
	onSubmit?: FormHTMLAttributes<HTMLFormElement>['onSubmit'];
	onReset?: FormHTMLAttributes<HTMLFormElement>['onReset'];
}

interface FormProps {
	ref: RefObject<HTMLFormElement>;
	onSubmit: Required<FormHTMLAttributes<HTMLFormElement>>['onSubmit'];
	onReset: Required<FormHTMLAttributes<HTMLFormElement>>['onReset'];
	noValidate: Required<FormHTMLAttributes<HTMLFormElement>>['noValidate'];
}

export function useForm({
	initialReport,
	fallbackNative,
	validate,
	noValidate,
	onSubmit,
	onReset,
}: FormConfig = {}): FormProps {
	const ref = useRef<HTMLFormElement>(null);
	const [formNoValidate, setFormNoValidate] = useState(
		noValidate || !fallbackNative,
	);

	useEffect(() => {
		setFormNoValidate(true);
	}, []);

	useEffect(() => {
		const form = ref.current;

		if (!form || noValidate) {
			return;
		}

		console.log('validate', form);
		validate?.(form);

		const handleInput = (event: Event) => {
			const field = event.target;

			if (!isFieldElement(field) || field.form !== form) {
				return;
			}

			validate?.(form);

			if (initialReport === 'onChange') {
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
				initialReport !== 'onBlur'
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
	}, [validate, initialReport, noValidate]);

	return {
		ref: ref,
		onSubmit(event) {
			if (!noValidate) {
				const form = event.currentTarget;

				for (const field of form.elements) {
					if (isFieldElement(field)) {
						field.dataset.conformTouched = 'true';
					}
				}

				if (
					!isFormNoValidate(event.nativeEvent as SubmitEvent) &&
					!event.currentTarget.reportValidity()
				) {
					return event.preventDefault();
				}
			}

			onSubmit?.(event);
		},
		onReset(event) {
			const form = event.currentTarget;

			for (const field of form.elements) {
				if (isFieldElement(field)) {
					delete field.dataset.conformTouched;
				}
			}

			onReset?.(event);

			setTimeout(() => {
				validate?.(form);
			}, 0);
		},
		noValidate: formNoValidate,
	};
}

interface FieldsetProps {
	ref: RefObject<HTMLFieldSetElement>;
	name?: string;
	form?: string;
	onInvalidCapture: FormEventHandler<HTMLFieldSetElement>;
}

export function useFieldset<Type extends Record<string, any>>(
	config: FieldsetConfig<Type> = {},
): [FieldsetProps, { [Key in keyof Type]-?: FieldProps<Type[Key]> }] {
	const ref = useRef<HTMLFieldSetElement>(null);
	const [errorMessage, setErrorMessage] = useState(config.error ?? {});

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

		const resetHandler = (e: Event) => {
			if (e.target !== fieldset.form) {
				return;
			}

			setErrorMessage({});
		};

		document.addEventListener('reset', resetHandler);

		return () => {
			document.removeEventListener('reset', resetHandler);
		};
	}, []);

	// useEffect(() => {
	// 	setErrorMessage(config.error ?? {});
	// }, [config.error]);

	return [
		{
			ref,
			name: config.name,
			form: config.form,
			onInvalidCapture(e: FormEvent<HTMLFieldSetElement>) {
				const fieldset = e.currentTarget;
				const field = e.target;

				if (!isFieldElement(field) || field.form !== fieldset.form) {
					return;
				}

				const key = getKey(e.currentTarget, field);

				if (key) {
					setErrorMessage((prev) => {
						// @ts-expect-error
						const prevMessage = prev[key] ?? '';

						if (prevMessage === field.validationMessage) {
							return prev;
						}

						return {
							...prev,
							[key]: field.validationMessage,
						};
					});

					e.preventDefault();
				}
			},
		},
		getFieldProps({
			...config,
			error: Object.assign({}, config.error, errorMessage),
		}),
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
	const controls: FieldListControl<Payload> = {
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

	return [list, controls];
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
