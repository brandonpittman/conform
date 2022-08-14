import { useForm, useFieldset, parse, isFieldElement } from '@conform-to/react';

export default function SignupForm() {
	const formConfig = useForm({
		validate(form) {
			const formData = new FormData(form);

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
						} else if (field.value !== formData.get('password')) {
							field.setCustomValidity('The password does not match');
						} else {
							field.setCustomValidity('');
						}
					}
				}
			}
		},
		onSubmit(event) {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const submission = parse(formData);

			console.log(submission);
		},
	});
	const {
		email,
		password,
		'confirm-password': confirmPassword,
	} = useFieldset(formConfig.ref);

	return (
		<form {...formConfig}>
			<fieldset>
				<label>
					<div>Email</div>
					<input type="email" name="email" required />
					<div>{email.error}</div>
				</label>
				<label>
					<div>Password</div>
					<input type="password" name="password" required minLength={10} />
					<div>{password.error}</div>
				</label>
				<label>
					<div>Confirm Password</div>
					<input type="password" name="confirm-password" required />
					<div>{confirmPassword.error}</div>
				</label>
			</fieldset>
			<div>
				<button type="submit">Login</button>
			</div>
		</form>
	);
}
