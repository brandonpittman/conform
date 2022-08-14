import { useForm, useFieldset, parse } from '@conform-to/react';

export default function LoginForm() {
	const formConfig = useForm({
		initialReport: 'onBlur',
		onSubmit: (event) => {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const submission = parse(formData);

			console.log(submission);
		},
	});
	const { email, password } = useFieldset(formConfig.ref);

	return (
		<form {...formConfig}>
			<label>
				<div>Email</div>
				<input type="email" name="email" required />
				<div>{email.error}</div>
			</label>
			<label>
				<div>Password</div>
				<input type="password" name="password" required />
				<div>{password.error}</div>
			</label>
			<div>
				<label>
					<span>Remember me</span>
					<input type="checkbox" name="remember-me" value="yes" />
				</label>
			</div>
			<div>
				<button type="submit">Login</button>
			</div>
		</form>
	);
}
