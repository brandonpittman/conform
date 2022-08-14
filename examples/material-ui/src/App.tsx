import { useForm, useFieldset, useInputControl } from '@conform-to/react';
import { TextField, Button, MenuItem, Stack } from '@mui/material';

export default function ArticleForm() {
	const formConfig = useForm({
		initialReport: 'onBlur',
		onSubmit: (event) => {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const data = Object.fromEntries(formData);

			console.log(data);
		},
	});
	const { title, category, content } = useFieldset(formConfig.ref);

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
	const [inputProps, control] = useInputControl(category.config);

	return (
		<form {...formConfig}>
			<Stack spacing={3}>
				<TextField
					label="title"
					name="title"
					error={Boolean(title.error)}
					helperText={title.error}
					required
				/>
				<input {...inputProps} required />
				<TextField
					label="Category"
					value={control.value}
					onChange={control.onChange}
					onBlur={control.onBlur}
					error={Boolean(category.error)}
					helperText={category.error}
					inputProps={{
						// To disable browser report caused by the required
						// attribute set by mui input
						onInvalid: control.onInvalid,
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
					error={Boolean(content.error)}
					helperText={content.error}
					inputProps={{
						minLength: 10,
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
