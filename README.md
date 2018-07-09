# TS2JaVerT

Compiler that processes TypeScript file and emits JavaScript code annotated with [JaVerT](https://link.springer.com/chapter/10.1007/978-3-319-63046-5_2) assertions.

The translation from types to assertions is presented in detail within the [report](https://github.com/RaduSzasz/TS2JaVerT/blob/master/Report.pdf).

## Options

- `input` -- the TypeScript file to process. This is a required argument
- `omit` -- parameters that should be omitted from the post-condition. The parameters are
specified in the form `func_id:param_name`, where `func_id` is the id of the function and
`param_name` is the name of the parameter that is to be omitted. `ret` is used for the
return value and `this` for the `this` object.