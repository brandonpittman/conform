import { useForm, useFieldset, useFieldList, parse } from '@conform-to/react';
import { useRef } from 'react';

interface Task {
	content: string;
	completed: boolean;
}

interface Todo {
	title: string;
	tasks: Task[];
}

export default function TodoForm() {
	const form = useForm({
		initialReport: 'onBlur',
		onSubmit: (event) => {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const submission = parse(formData);

			console.log(submission);
		},
	});
	const { title, tasks } = useFieldset<Todo>(form.ref);
	const [taskList, control] = useFieldList(tasks);

	return (
		<form {...form}>
			<fieldset>
				<label>
					<div>Title</div>
					<input type="text" name="title" required />
					<div>{title.error}</div>
				</label>
				<ul>
					{taskList.map((task, index) => (
						<li key={task.key}>
							<TaskFieldset
								title={`Task #${index + 1}`}
								name={`tasks[${index}]`}
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
		</form>
	);
}

export function TaskFieldset({ title, name }: { title: string; name: string }) {
	const ref = useRef<HTMLFieldSetElement>(null);
	const { content, completed } = useFieldset<Task>(ref, { name });

	return (
		<fieldset ref={ref}>
			<label>
				<span>{title}</span>
				<input type="text" name={content.name} required />
				<div>{content.error}</div>
			</label>
			<div>
				<label>
					<span>Completed</span>
					<input type="checkbox" name={completed.name} value="yes" />
				</label>
			</div>
		</fieldset>
	);
}
