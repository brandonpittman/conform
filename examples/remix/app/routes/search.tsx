import { useSearchParams } from 'react-router-dom';
import { useForm, isFieldElement } from '@conform-to/react';
import { styles } from '~/helpers';
import { useState } from 'react';

export default function SearchForm() {
	const [searchParams, setSearchParams] = useSearchParams();
	const formProps = useForm({
		/**
		 * Decide when the error should be reported initially.
		 * The options are `onSubmit`, `onBlur` or `onChange`.
		 * Default to `onSubmit`
		 */
		initialReport: 'onBlur',

		/**
		 * Customise validation behaviour
		 * Fallbacks to native validation message provided
		 * by the browser vendors
		 */
		validate(form) {
			for (const field of form.elements) {
				if (!isFieldElement(field)) {
					continue;
				}

				switch (field.name) {
					case 'keyword':
						if (field.validity.tooShort) {
							// Native constraint (minLength) with custom message
							field.setCustomValidity('Please fill in at least 4 characters');
						} else if (field.value === 'something') {
							// Custom constraint
							field.setCustomValidity('Be a little more specific please');
						} else {
							// Reset the custom error state of the field (Important!)
							field.setCustomValidity('');
						}
						break;
					case 'category':
						// Here we didn't call setCustomValidity for category
						// So it fallbacks to native validation message
						// These messages varies based on browser vendors
						break;
				}
			}
		},

		/**
		 * Form submit handler
		 * This will be called only if all the fields are valid
		 */
		onSubmit(e) {
			e.preventDefault();

			const formData = new FormData(e.currentTarget);
			const query = new URLSearchParams();

			for (const [key, value] of formData) {
				query.set(key, value.toString());
			}

			setSearchParams(query);
		},
	});
	const [keywordError, setKeywordError] = useState('');
	const [categoryError, setCategoryError] = useState('');

	return (
		<form {...formProps}>
			<header className={styles.header}>
				<h1>Search Form</h1>
				{Array.from(searchParams.keys()).length > 0 ? (
					<pre className={styles.result}>
						{JSON.stringify(Object.fromEntries(searchParams), null, 2)}
					</pre>
				) : null}
			</header>
			<fieldset className={styles.card}>
				<label className="block">
					<div className={styles.label}>Keyword</div>
					<input
						className={keywordError ? styles.invalidInput : styles.input}
						name="keyword"
						minLength={4}
						autoComplete="off"
						onInvalid={(e) => {
							e.preventDefault();
							setKeywordError(e.currentTarget.validationMessage);
						}}
					/>
					<p className={styles.errorMessage}>{keywordError}</p>
				</label>
				<label className="block">
					<div className={styles.label}>Category</div>
					<select
						className={categoryError ? styles.invalidInput : styles.input}
						name="category"
						required
						onInvalid={(e) => {
							e.preventDefault();
							setCategoryError(e.currentTarget.validationMessage);
						}}
					>
						<option value="">Please select</option>
						<option value="book">Book</option>
						<option value="food">Food</option>
						<option value="movie">Movie</option>
						<option value="music">Music</option>
					</select>
					<p className={styles.errorMessage}>{categoryError}</p>
				</label>
				<button type="submit" className={styles.buttonPrimary}>
					Search
				</button>
			</fieldset>
		</form>
	);
}
