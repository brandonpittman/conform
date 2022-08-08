# @conform-to/react

> [React](https://github.com/facebook/react) adapter for [conform](https://github.com/edmundhung/conform)

## API Reference

- [useForm](#useForm)
- [useFieldset](#useFieldset)
- [useFieldList](#useFieldList)
- [useShadowInput](#useShadowInput)
- [conform](#conform)

---

### useForm

By default, the browser calls [reportValidity()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reportValidity) on the form element when you submit the form. This checks the validity of all the fields in it and reports if there are errors through the bubbles.

This hook enhances the form validation behaviour in 3 parts:

1. It lets you hook up custom validation logic into the life cycle of the form. The form will be validated when shown and revalidated when the value of the input has been changed.
2. It marks the input that user touched based on the `initialReport` option. This could be as earliest as the user start typing or as late as the user submit the form.
3. It reports error by triggering the `invalid` event of the corresponding input once it is touched with [reportValidity()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reportValidity)

```tsx
import { useForm } from '@conform-to/react';

function RandomForm() {
  const formProps = useForm({
    /**
     * Define when the error should be reported initially.
     * Support "onSubmit", "onChange", "onBlur".
     *
     * Default to `onSubmit`
     */
    initialReport: 'onBlur',

    /**
     * Enable native validation before hydation.
     */
    fallbackNative: true,

    /**
     * Allow the form to be submitted regardless of the form validity.
     */
    noValidate: false,

    /**
     * A function to be called when the form should be (re)validated.
     */
    validate(form) {
      // ...
    },

    /**
     * The submit event handler of the form. It will be called
     * only when the form is considered valid.
     */
    onSubmit(e) {
      // ...
    },

    /**
     * The reset event handler of the form.
     */
    onReset(e) {
      // ...
    },
  });

  return <form {...formProps}>{/* ... */}</form>;
}
```

<details>
<summary>What is `formProps`?</summary>

It is a group of properties required to setup the form. They can also be set explicitly as shown below:

```tsx
<form
  ref={formProps.ref}
  onSubmit={formProps.onSubmit}
  onReset={formProps.onReset}
  noValidate={formProps.noValidate}
>
  {/* ... */}
</form>
```

</details>

<details>
<summary>How is the `validate` function looks like?</summary>

```tsx
/**
 * Customise form validation
 * Fallbacks to native browser validation if not specified
 */
function validate(form) {
  for (const field of form.elements) {
    switch (field.name) {
      case 'name': {
        if (field.validity.valueMissing) {
          /**
           * Setting error message based on validity
           */
          field.setCustomValidity('Required');
        } else if (field.value === 'something') {
          /**
           * Setting error message based on custom constraint
           */
          field.setCustomValidity('Please enter a valid name');
        } else {
          /**
           * Clearing the error message (Important!)
           */
          field.setCustomValidity('');
        }
      }
    }
  }
}
```

</details>

---

### useFieldset

This hook is a helper for configuring a set of fields and monitoring its state. It lets you:

1. Define the config in one single place. e.g. name, default value and constraint.
2. Distribute the config to the input control with the [conform](#conform) helper functions.
3. Capture the error at the form/fieldset level, removing the need to setup the invalid handler on each field.

```tsx
import { useForm, useFieldset } from '@conform-to/react';

/**
 * Consider the schema as follow:
 */
type Book = {
  name: string;
  isbn: string;
};

function BookFieldset() {
  const form = useForm();
  const { name, isbn } = useFieldset<Book>(form.ref, {
    /**
     * Name prefix for nested fieldset.
     */
    name: 'book',

    /**
     * Id of the form
     */
    form: 'random-form-id',

    /**
     * Default value of the fieldset
     */
    defaultValue: {
      isbn: '0340013818',
    },

    /**
     * Error reported by the server
     */
    error: {
      isbn: 'Invalid ISBN',
    },

    constraint: {
      isbn: {
        required: true,
        pattern: '[0-9]{10,13}',
      },
    },
  });

  const {
    /**
     * This would be `book.isbn` instead of `isbn`
     * if the `name` option is provided
     */
    name,

    /**
     * This would be `random-form-id`
     * because of the `form` option provided
     */
    form,

    /**
     * This would be `0340013818` if specified
     * on the `initalValue` option
     */
    defaultValue,

    /**
     * Current error message
     * This would be 'Invalid ISBN' initially if specified
     * on the `error` option
     */
    error,

    /**
     * Constraint of the field (required, minLength etc)
     *
     * For example, the constraint of the isbn field would be:
     * {
     *   required: true,
     *   pattern: '[0-9]{10,13}'
     * }
     */
    constraint,
  } = isbn;

  return <form {...form}>{/* ... */}</form>;
}
```

If you have no direct access to the form ref, you can also pass a fieldset ref.

```ts
import { useFieldset } from '@conform-to/react';
import { useRef } from 'react';

function Fieldset() {
  const ref = useRef();
  const fieldset = useFieldset(ref);

  return <fieldset ref={ref}>{/* ... */}</fieldset>;
}
```

---

### useFieldList

This main job of this hook is key management.

```tsx
import { useFieldset, useFieldList } from '@conform-to/react';

/**
 * Consider the schema as follow:
 */
type Book = {
  name: string;
  isbn: string;
};

type Collection = {
  books: Book[];
};

function BookList() {
  const [bookList, control] = useFieldList();

  return (
    <div>
      {bookList.map((book, index) => (
        <div key={book.key}>
          {/* To setup the fields */}
          <input
            name={`books[${index}].name`}
            defaultValue={book.props.defaultValue.name}
          />
          <input
            name={`books[${index}].isbn`}
            defaultValue={book.props.defaultValue.isbn}
          />

          {/* To setup a delete button */}
          <button {...control.remove(index)}>Delete</button>
        </div>
      ))}

      {/* To setup a button that can append a new row with optional default value */}
      <button {...control.append({ name: '', isbn: '' })}>add</button>
    </div>
  );
}
```

This hook can also be used in combination with `useFieldset` to distribute the config:

```tsx
import { useFieldset, useFieldList } from '@conform-to/react';
import { useRef } from 'react';

function CollectionForm() {
  const form = useForm();
  const { books } = useFieldset<Collection>(form.ref);
  const [bookList, control] = useFieldList(books);

  return (
    <form {...form}>
      {bookList.map((book, index) => (
        <div key={book.key}>
          {/* `book.props` is a FieldProps object similar to `books` */}
          <BookFieldset {...book.props}>

          {/* To setup a delete button */}
          <button {...control.remove(index)}>Delete</button>
        </div>
      ))}

      {/* To setup a button that can append a new row */}
      <button {...control.append()}>add</button>
    </form>
  );
}

/**
 * This is basically the BookFieldset component from
 * the `useFieldset` example, but setting all the
 * options with the component props instead
 */
function BookFieldset({ name, form, defaultValue, error }) {
  const ref = useRef();
  const { name, isbn } = useFieldset(ref, {
    name,
    form,
    defaultValue,
    error,
  });

  return (
    <fieldset ref={ref}>
      {/* ... */}
    </fieldset>
  );
}
```

<details>
  <summary>What can I do with `controls`?</summary>

```tsx
// To append a new row with optional defaultValue
<button {...controls.append(defaultValue)}>Append</button>;

// To prepend a new row with optional defaultValue
<button {...controls.prepend(defaultValue)}>Prepend</button>;

// To remove a row by index
<button {...controls.remove(index)}>Remove</button>;

// To replace a row with another defaultValue
<button {...controls.replace(index, defaultValue)}>Replace</button>;

// To reorder a particular row to an another index
<button {...controls.reorder(fromIndex, toIndex)}>Reorder</button>;
```

</details>

---

### useShadowInput

This hook make it easy for you to use a shadow input for validation. Mainly used to get around problem integrating with controlled component.

```tsx
import { useShadowInput } from '@conform-to/react';
import { Select, MenuItem } from '@mui/material';

function MuiForm() {
  const [ref, control] = useShadowInput();

  return (
    <div>
      {/* Render a shadow input somewhere */}
      <input ref={ref} name="category" hidden required />

      {/* MUI Select is a controlled component */}
      <Select
        label="Category"
        value={control.value}
        onChange={(e) => control.onChange(e.target.value)}
        onBlur={() => control.onBlur()}
      >
        <MenuItem value="">Please select</MenuItem>
        <MenuItem value="a">Category A</MenuItem>
        <MenuItem value="b">Category B</MenuItem>
        <MenuItem value="c">Category C</MenuItem>
      </TextField>
    </div>
  )
}
```

---

### conform

It provides several helpers to setup a native input field quickly:

```tsx
import { useFieldset, conform } from '@conform-to/react';
import { useRef } from 'react';

function RandomForm() {
  const ref = useRef();
  const { cateogry } = useFieldset(ref);

  return (
    <fieldset ref={ref}>
      <input {...conform.input(cateogry, { type: 'text' })} />
      <textarea {...conform.textarea(cateogry)} />
      <select {...conform.select(cateogry)}>{/* ... */}</select>
    </fieldset>
  );
}
```

This is equivalent to:

```tsx
function RandomForm() {
  const ref = useRef();
  const { cateogry } = useFieldset(ref);

  return (
    <fieldset ref={ref}>
      <input
        type="text"
        name={cateogry.name}
        form={cateogry.form}
        defaultValue={cateogry.defaultValue}
        requried={cateogry.required}
        minLength={cateogry.minLength}
        maxLength={cateogry.maxLength}
        min={cateogry.min}
        max={cateogry.max}
        multiple={cateogry.multiple}
        pattern={cateogry.pattern}
      >
      <textarea
        name={cateogry.name}
        form={cateogry.form}
        defaultValue={cateogry.defaultValue}
        requried={cateogry.required}
        minLength={cateogry.minLength}
        maxLength={cateogry.maxLength}
      />
      <select
        name={cateogry.name}
        form={cateogry.form}
        defaultValue={cateogry.defaultValue}
        requried={cateogry.required}
        multiple={cateogry.multiple}
      >
        {/* ... */}
      </select>
    </fieldset>
  );
}
```
