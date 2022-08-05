import { useForm, useShadowInput } from '@conform-to/react';
import { TextField, Button, MenuItem, Stack } from '@mui/material';
import { useState } from 'react';

export default function ArticleForm() {
	const formProps = useForm({
		initialReport: 'onBlur',
		onSubmit: (event) => {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const data = Object.fromEntries(formData);

			console.log({ data });
		},
	});

	/**
	 * MUI Select is a controlled component and behaves very different from native input/select.
	 * For example, the onChange handler is called before the value is updated, result in early
	 * revalidation. The event provided is also a click event from the li element instead of a
	 * change event from the input element, making it less straight-forward to check the validity
	 * of the field.
	 *
	 * This hook help you setting up a shadow input that would be used to validate against the schema instead and
	 * let you hook it up with the controlled component life cycle
	 */
	const [ref, control] = useShadowInput();
	const [titleError, setTitleError] = useState('');
	const [categoryError, setCateogryError] = useState('');
	const [contentError, setContentError] = useState('');

	return (
		<form {...formProps}>
			<Stack spacing={3}>
				<TextField
					label="title"
					name="title"
					error={Boolean(titleError)}
					inputProps={{
						onInvalid(e) {
							e.preventDefault();
							setTitleError(e.currentTarget.validationMessage);
						},
					}}
					helperText={titleError}
					required
				/>
				<input
					ref={ref}
					name="category"
					onInvalid={(e) => {
						e.preventDefault();
						setCateogryError(e.currentTarget.validationMessage);
					}}
					hidden
					required
				/>
				<TextField
					label="Category"
					value={control.value}
					onChange={(e) => control.onChange(e.target.value)}
					onBlur={control.onBlur}
					error={Boolean(categoryError)}
					helperText={categoryError}
					inputProps={{
						onInvalid(e) {
							// To disable native browser report due to the required attribute
							e.preventDefault();
						},
					}}
					select
					required
				>
					<MenuItem value="">Please select</MenuItem>
					<MenuItem value="a">Option A</MenuItem>
					<MenuItem value="b">Option B</MenuItem>
					<MenuItem value="c">Option C</MenuItem>
				</TextField>
				<TextField
					label="Content"
					name="content"
					error={Boolean(contentError)}
					helperText={contentError}
					inputProps={{
						minLength: 10,
						onInvalid(e) {
							e.preventDefault();
							setContentError(e.currentTarget.validationMessage);
						},
					}}
					required
					multiline
				/>
				<Button type="submit" variant="contained">
					Submit
				</Button>
			</Stack>
		</form>
	);
}
