# Conform &middot; [![latest release](https://img.shields.io/github/v/release/edmundhung/conform?include_prereleases)](https://github.com/edmundhung/conform/releases) [![GitHub license](https://img.shields.io/github/license/edmundhung/conform)](https://github.com/edmundhung/conform/blob/main/LICENSE)

Conform is a form validation library built on top of the [Constraint Validation](https://caniuse.com/constraint-validation) API.

- **Progressive Enhancement**: It is designed based on the [HTML specification](https://html.spec.whatwg.org/dev/form-control-infrastructure.html#the-constraint-validation-api). From validating the form to reporting error messages for each field, if you don't like part of the solution, just replace it with your own.
- **Framework Agnostic**: The DOM is the only dependency. Conform makes use of native [Web APIs](https://developer.mozilla.org/en-US/docs/Web/API) exclusively. You don't have to use React / Vue / Svelte to utilise this library.
- **Flexible Setup**: It can validates fields anywhere in the dom with the help of [form attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#form). Also enables CSS pseudo-classes like `:valid` and `:invalid`, allowing flexible styling across your form without the need to manipulate the class names.

## Example

```tsx
import { useForm } from '@conform-to/react';

export default function LoginForm() {
  const formProps = useForm({
    initialReport: 'onBlur',
    onSubmit: (event) => {
      event.preventDefault();

      const formData = new FormData(event.currentTarget);
      const value = Object.fromEntries(formData);

      console.log(value);
    },
  });
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  return (
    <form {...formProps}>
      <label>
        <div>Email</div>
        <input
          type="email"
          name="email"
          required
          onInvalid={(e) => {
            e.preventDefault();
            setEmailError(e.currentTarget.validationMessage);
          }}
        />
        <div>{emailError}</div>
      </label>
      <label>
        <div>Password</div>
        <input
          type="password"
          name="password"
          required
          onInvalid={(e) => {
            e.preventDefault();
            setPasswordError(e.currentTarget.validationMessage);
          }}
        />
        <div>{passwordError}</div>
      </label>
      <button type="submit">Login</button>
    </form>
  );
}
```

More examples can be found here: [Codesandbox](https://codesandbox.io/s/github/edmundhung/conform/tree/v0.2.0/examples/remix?file=/app/routes/search.tsx) | [Stackblitz](https://stackblitz.com/github/edmundhung/conform/tree/v0.2.0/examples/remix?file=app%2Froutes%2Fsearch.tsx)

## API References

| Package                                     | Description                                                  | Size                                                                                                                                |
| :------------------------------------------ | :----------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| [@conform-to/react](packages/conform-react) | View adapter for [react](https://github.com/facebook/react)  | [![package size](https://img.shields.io/bundlephobia/minzip/@conform-to/react)](https://bundlephobia.com/package/@conform-to/react) |
| [@conform-to/zod](packages/conform-zod)     | Schema resolver for [zod](https://github.com/colinhacks/zod) | [![package size](https://img.shields.io/bundlephobia/minzip/@conform-to/zod)](https://bundlephobia.com/package/@conform-to/zod)     |
