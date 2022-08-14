import {
	type FieldConfig,
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
	tasks: z.array(Task).min(1),
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
	const formConfig = useForm({
		initialReport: 'onBlur',
		validate: resolve(Todo),
	});
	const { title, tasks } = useFieldset<z.infer<typeof Todo>>(formConfig.ref, {
		defaultValue: formState?.value,
		initialError: formState?.error.details,
	});
	const [taskList, control] = useListControl(formConfig.ref, tasks.config);

	return (
		<Form method="post" {...formConfig}>
			<fieldset>
				<label>
					<div>Title</div>
					<input
						className={title.error ? 'error' : ''}
						name="title"
						defaultValue={title.config.defaultValue}
					/>
					<div>{title.error}</div>
				</label>
				<ul>
					{taskList.map((task, index) => (
						<li key={task.key}>
							<TaskFieldset title={`Task #${index + 1}`} {...task.config} />
							<button {...control.remove(index)}>Delete</button>
							<button {...control.reorder(index, 0)}>Move to top</button>
							<button {...control.replace(index, { content: '' })}>
								Clear
							</button>
						</li>
					))}
				</ul>
				<button
					hidden
					name={tasks.config.name}
					className={tasks.error ? 'error' : ''}
				/>
				<div>{tasks.error}</div>
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
}: FieldConfig<z.infer<typeof Task>> & { title: string }) {
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
