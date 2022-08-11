import {
	type FieldProps,
	useForm,
	useFieldset,
	useListControl,
} from '@conform-to/react';
import { parse, resolve } from '@conform-to/zod';
import { type ActionArgs } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { useRef } from 'react';
import { z } from 'zod';

const Task = z.object({
	content: z.string(),
	completed: z.preprocess((value) => value === 'yes', z.boolean()),
});

const Todo = z.object({
	title: z.string(),
	tasks: z.array(Task),
});

export let action = async ({ request }: ActionArgs) => {
	const formData = await request.formData();
	const submission = parse(formData, Todo);

	if (submission.state === 'accepted') {
		console.log('Submission', submission.data);
	}

	return submission.form;
};

export default function OrderForm() {
	const formState = useActionData<typeof action>();
	const formProps = useForm({
		initialReport: 'onBlur',
		validate: resolve(Todo),
	});
	const { title, tasks } = useFieldset<z.infer<typeof Todo>>(formProps.ref, {
		defaultValue: formState?.value,
		error: formState?.error,
	});
	const [taskList, control] = useListControl(formProps.ref, tasks);

	return (
		<Form method="post" {...formProps}>
			<fieldset>
				<label>
					<div>Title</div>
					<input
						className={title.error ? 'error' : ''}
						name="title"
						defaultValue={title.defaultValue}
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
}: FieldProps<z.infer<typeof Task>> & { title: string }) {
	const ref = useRef<HTMLFieldSetElement>(null);
	const { content, completed } = useFieldset<z.infer<typeof Task>>(ref, config);

	return (
		<fieldset ref={ref}>
			<label>
				<div>{title}</div>
				<input
					type="text"
					className={content.error ? 'error' : ''}
					name={`${config.name}.content`}
					defaultValue={config.defaultValue?.content}
				/>
				<div>{content.error}</div>
			</label>
			<div>
				<label>
					<span>Completed</span>
					<input
						type="checkbox"
						className={completed.error ? 'error' : ''}
						name={`${config.name}.completed`}
						value="yes"
						defaultChecked={config.defaultValue?.completed === 'yes'}
					/>
				</label>
			</div>
		</fieldset>
	);
}
