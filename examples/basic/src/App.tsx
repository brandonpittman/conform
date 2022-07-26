import { useFieldset, conform } from '@conform-to/react';
import { resolve, parse } from '@conform-to/zod';
import z from 'zod';

const signup = z
	.object({
		email: z.string().email(),
		password: z.string().min(8),
		confirm: z.string(),
	})
	.refine((value) => value.password === value.confirm, {
		message: 'The password do not match',
		path: ['confirm'],
	});

export default function SignupForm() {
	const [fieldsetProps, { email, password, confirm }] = useFieldset(
		resolve(signup),
		{
			initialReport: 'onBlur',
		},
	);

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();

				const formData = new FormData(event.currentTarget);
				const result = parse(formData, signup);

				console.log({ result });
			}}
		>
			<fieldset {...fieldsetProps}>
				<legend>Sign up</legend>
				<label>
					<div>Email</div>
					<input {...conform.input(email)} />
					<strong>{email.error}</strong>
				</label>
				<label>
					<div>Password</div>
					<input {...conform.input(password, { type: 'password' })} />
					<strong>{password.error}</strong>
				</label>
				<label>
					<div>Confirm Password</div>
					<input {...conform.input(confirm, { type: 'password' })} />
					<strong>{confirm.error}</strong>
				</label>
				<div>
					<button type="submit">Sign up</button>
				</div>
			</fieldset>
		</form>
	);
}
