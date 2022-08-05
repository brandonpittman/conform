import {
	type FieldsetConfig,
	type FormState,
	useForm,
	useFieldset,
	useFieldList,
	conform,
} from '@conform-to/react';
import { parse, resolve, getConstraint } from '@conform-to/zod';
import { type ActionFunction } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
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
	const [fieldsetProps, { title, tasks }] = useFieldset({
		constraint: getConstraint(Todo),
		defaultValue: formState?.value,
		error: formState?.error,
	});
	const [taskList, control] = useFieldList(tasks);

	return (
		<Form method="post" {...formProps}>
			<fieldset {...fieldsetProps}>
				<label>
					<div>Title</div>
					<input
						className={title.error ? 'error' : ''}
						{...conform.input(title)}
					/>
					<div>{title.error}</div>
				</label>
				<ul>
					{taskList.map((task, index) => (
						<li key={task.key}>
							<TaskFieldset title={`Task #${index + 1}`} {...task.props} />
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
	const [fieldsetProps, { content, completed }] = useFieldset({
		constraint: getConstraint(Task),
		...config,
	});

	return (
		<fieldset {...fieldsetProps}>
			<label>
				<div>{title}</div>
				<input
					className={content.error ? 'error' : ''}
					{...conform.input(content, { type: 'text' })}
				/>
				<div>{content.error}</div>
			</label>
			<div>
				<label>
					<span>Completed</span>
					<input
						{...conform.input(completed, { type: 'checkbox', value: 'yes' })}
					/>
				</label>
			</div>
		</fieldset>
	);
}
