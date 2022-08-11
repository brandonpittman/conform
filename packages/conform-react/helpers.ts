import { type FieldConfig, type Primitive } from '@conform-to/dom';
import {
	type InputHTMLAttributes,
	type SelectHTMLAttributes,
	type TextareaHTMLAttributes,
} from 'react';

export function input<Schema extends Primitive>(
	config: FieldConfig<Schema>,
	{ type, value }: { type?: string; value?: string } = {},
): InputHTMLAttributes<HTMLInputElement> {
	const isCheckboxOrRadio = type === 'checkbox' || type === 'radio';
	const attributes: InputHTMLAttributes<HTMLInputElement> = {
		type,
		name: config.name,
		form: config.form,
		required: config.constraint?.required,
		minLength: config.constraint?.minLength,
		maxLength: config.constraint?.maxLength,
		min: config.constraint?.min,
		max: config.constraint?.max,
		step: config.constraint?.step,
		pattern: config.constraint?.pattern,
		multiple: config.constraint?.multiple,
	};

	if (isCheckboxOrRadio) {
		attributes.value = value ?? 'on';
		attributes.defaultChecked = config.defaultValue === attributes.value;
	} else {
		attributes.defaultValue = `${config.defaultValue ?? ''}`;
	}

	return attributes;
}

export function select<Schema extends Primitive | Array<Primitive>>(
	config: FieldConfig<Schema>,
): SelectHTMLAttributes<HTMLSelectElement> {
	return {
		name: config.name,
		form: config.form,
		defaultValue: config.constraint?.multiple
			? Array.isArray(config.defaultValue)
				? config.defaultValue
				: []
			: `${config.defaultValue ?? ''}`,
		required: config.constraint?.required,
		multiple: config.constraint?.multiple,
	};
}

export function textarea<Schema extends string | undefined>(
	config: FieldConfig<Schema>,
): TextareaHTMLAttributes<HTMLTextAreaElement> {
	return {
		name: config.name,
		form: config.form,
		defaultValue: `${config.defaultValue ?? ''}`,
		required: config.constraint?.required,
		minLength: config.constraint?.minLength,
		maxLength: config.constraint?.maxLength,
	};
}
