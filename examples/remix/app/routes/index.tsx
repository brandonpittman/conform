import {
	type FieldsetConfig,
	type FormState,
	useForm,
	useFieldList,
} from '@conform-to/react';
import { parse, resolve } from '@conform-to/zod';
import { type ActionFunction } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { useState } from 'react';
import { z } from 'zod';

const Task = z.object({
	content: z.string(),
	completed: z.preprocess((value) => value === 'yes', z.boolean()),
});

const Todo = z.object({
	title: z.string(),
	tasks: z.array(Task),
});

export let action: ActionFunction = async ({ request }) => {
	const formData = await request.formData();
	const submission = parse(formData, Todo);

	if (submission.state === 'accepted') {
		console.log('Submission', submission.data);
	}

	return submission.form;
};

export default function OrderForm() {
	const formState = useActionData<FormState<z.infer<typeof Todo>>>();
	const formProps = useForm({
		initialReport: 'onBlur',
		validate: resolve(Todo),
	});
	const [taskList, control] = useFieldList<z.infer<typeof Task>>({
		name: 'tasks',
		defaultValue: formState?.value.tasks,
		error: formState?.error.tasks,
	});
	const [titleError, setTitleError] = useState(formState?.error.title ?? '');

	return (
		<Form method="post" {...formProps}>
			<fieldset>
				<label>
					<div>Title</div>
					<input
						className={titleError ? 'error' : ''}
						name="title"
						defaultValue={formState?.value.title}
						onInvalid={(e) => {
							e.preventDefault();
							setTitleError(e.currentTarget.validationMessage);
						}}
					/>
					<div>{titleError}</div>
				</label>
				<ul>
					{taskList.map((task, index) => (
						<li key={task.key}>
							<TaskFieldset
								title={`Task #${index + 1}`}
								name={task.props.name}
								defaultValue={task.props.defaultValue}
								error={task.props.error}
							/>
							<button {...control.remove(index)}>Delete</button>
							<button {...control.reorder(index, 0)}>Move to top</button>
							<button {...control.replace(index, { content: '' })}>
								Clear
							</button>
						</li>
					))}
				</ul>
				<div>
					<button {...control.append()}>Add task</button>
				</div>
			</fieldset>
			<button type="submit">Save</button>
		</Form>
	);
}

function TaskFieldset({
	title,
	...config
}: FieldsetConfig<z.infer<typeof Task>> & { title: string }) {
	const [contentError, setContentError] = useState(config.error?.content ?? '');
	const [completedError, setCompletedError] = useState(
		config.error?.completed ?? '',
	);

	return (
		<fieldset>
			<label>
				<div>{title}</div>
				<input
					type="text"
					className={contentError ? 'error' : ''}
					name={`${config.name}.content`}
					defaultValue={config.defaultValue?.content}
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
					<input
						type="checkbox"
						className={completedError ? 'error' : ''}
						name={`${config.name}.completed`}
						value="yes"
						defaultChecked={config.defaultValue?.completed === 'yes'}
						onInvalid={(e) => {
							e.preventDefault();
							setCompletedError(e.currentTarget.validationMessage);
						}}
					/>
				</label>
			</div>
		</fieldset>
	);
}
