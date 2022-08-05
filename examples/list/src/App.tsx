import { useForm, useFieldList, parse } from '@conform-to/react';
import { useState } from 'react';

export default function TodoList() {
	const formProps = useForm({
		initialReport: 'onBlur',
		onSubmit: (event) => {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const submission = parse(formData);

			console.log(submission);
		},
	});
	const [tasks, control] = useFieldList();
	const [titleError, setTitleError] = useState('');

	return (
		<form {...formProps}>
			<label>
				<div>Title</div>
				<input
					type="text"
					name="title"
					required
					onInvalid={(e) => {
						e.preventDefault();
						setTitleError(e.currentTarget.validationMessage);
					}}
				/>
				<div>{titleError}</div>
			</label>
			{tasks.map((task, index) => (
				<div key={task.key}>
					<TaskFieldset title={`Task #${index + 1}`} name={`tasks[${index}]`} />
					<button {...control.remove(index)}>Delete</button>
					<button {...control.reorder(index, 0)}>Move to top</button>
					<button {...control.replace(index, { content: '' })}>Clear</button>
				</div>
			))}
			<div>
				<button {...control.append()}>Add task</button>
			</div>
			<div>
				<button type="submit">Save</button>
			</div>
		</form>
	);
}

export function TaskFieldset({ title, name }: { title: string; name: string }) {
	const [contentError, setContentError] = useState('');

	return (
		<fieldset>
			<label>
				<span>{title}</span>
				<input
					type="text"
					name={`${name}.content`}
					required
					onInvalid={(e) => {
						e.preventDefault();
						setContentError(e.currentTarget.validationMessage);
					}}
				/>
				<div>{contentError}</div>
			</label>
			<div>
				<label>
					<span>Completed</span>
					<input type="checkbox" name={`${name}.completed`} value="yes" />
				</label>
			</div>
		</fieldset>
	);
}
