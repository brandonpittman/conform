import { type FieldConfig } from '@conform-to/dom';
import {
	type InputHTMLAttributes,
	type SelectHTMLAttributes,
	type TextareaHTMLAttributes,
} from 'react';

export function input<Schema>(
	config: FieldConfig<Schema>,
	{ type, value }: { type?: string; value?: string } = {},
): InputHTMLAttributes<HTMLInputElement> {
	const isCheckboxOrRadio = type === 'checkbox' || type === 'radio';
	const attributes: InputHTMLAttributes<HTMLInputElement> = {
		type,
		name: config.name,
		form: config.form,
		required: config.required,
		minLength: config.minLength,
		maxLength: config.maxLength,
		min: config.min,
		max: config.max,
		step: config.step,
		pattern: config.pattern,
		multiple: config.multiple,
	};

	if (isCheckboxOrRadio) {
		attributes.value = value ?? 'on';
		attributes.defaultChecked = config.defaultValue === attributes.value;
	} else {
		attributes.defaultValue =
			typeof config.defaultValue === 'object'
				? JSON.stringify(config.defaultValue)
				: `${config.defaultValue ?? ''}`;
	}

	return attributes;
}

export function select<Schema>(
	config: FieldConfig<Schema>,
): SelectHTMLAttributes<HTMLSelectElement> {
	return {
		name: config.name,
		form: config.form,
		defaultValue: config.multiple
			? Array.isArray(config.defaultValue)
				? config.defaultValue
				: []
			: `${config.defaultValue ?? ''}`,
		required: config.required,
		multiple: config.multiple,
	};
}

export function textarea<Schema>(
	config: FieldConfig<Schema>,
): TextareaHTMLAttributes<HTMLTextAreaElement> {
	return {
		name: config.name,
		form: config.form,
		defaultValue: `${config.defaultValue ?? ''}`,
		required: config.required,
		minLength: config.minLength,
		maxLength: config.maxLength,
	};
}
