import { useForm, isFieldElement } from '@conform-to/react';
import { useState } from 'react';

export default function SignupForm() {
	const formProps = useForm({
		validate: (form) => {
			for (const field of form.elements) {
				if (!isFieldElement(field)) {
					continue;
				}

				switch (field.name) {
					case 'email':
						if (field.validity.valueMissing) {
							field.setCustomValidity('Email is required');
						} else if (field.validity.typeMismatch) {
							field.setCustomValidity('Please enter a valid email');
						} else {
							field.setCustomValidity('');
						}
						break;
					case 'password':
						if (field.validity.valueMissing) {
							field.setCustomValidity('Password is required');
						} else if (field.validity.tooShort) {
							field.setCustomValidity(
								'The password should be at least 10 characters long',
							);
						} else {
							field.setCustomValidity('');
						}
						break;
					case 'confirm-password': {
						if (field.validity.valueMissing) {
							field.setCustomValidity('Confirm Password is required');
						} else if (field.value !== new FormData(form).get('password')) {
							field.setCustomValidity('The password does not match');
						} else {
							field.setCustomValidity('');
						}
					}
				}
			}
		},
		onSubmit: (event) => {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const data = Object.fromEntries(formData);

			console.log({ data });
		},
	});
	const [emailError, setEmailError] = useState('');
	const [passwordError, setPasswordError] = useState('');
	const [confirmPasswordError, setConfirmPasswordError] = useState('');

	return (
		<form {...formProps}>
			<label>
				<div>Email</div>
				<input
					type="email"
					name="email"
					required
					onInvalid={(e) => {
						e.preventDefault();
						setEmailError(e.currentTarget.validationMessage);
					}}
				/>
				<div>{emailError}</div>
			</label>
			<label>
				<div>Password</div>
				<input
					type="password"
					name="password"
					required
					minLength={10}
					onInvalid={(e) => {
						e.preventDefault();
						setPasswordError(e.currentTarget.validationMessage);
					}}
				/>
				<div>{passwordError}</div>
			</label>
			<label>
				<div>Confirm Password</div>
				<input
					type="password"
					name="confirm-password"
					required
					onInvalid={(e) => {
						e.preventDefault();
						setConfirmPasswordError(e.currentTarget.validationMessage);
					}}
				/>
				<div>{confirmPasswordError}</div>
			</label>
			<div>
				<button type="submit">Login</button>
			</div>
		</form>
	);
}
