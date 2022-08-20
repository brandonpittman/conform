import type { FormEvent } from 'react';
import { createRequest as baseCreateRequest } from '@conform-to/dom';

export {
	type FieldConfig,
	type FieldConstraint,
	type FieldElement,
	type FormState,
	type FormValidate,
	type Submission,
	parse,
	getFormData,
	createValidate,
	isFieldElement,
} from '@conform-to/dom';
export * from './hooks';
export * as conform from './helpers';

export function createRequest(event: FormEvent<HTMLFormElement>): Request {
	return baseCreateRequest(event.nativeEvent as SubmitEvent);
}
