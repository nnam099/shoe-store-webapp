export class AppError extends Error {
  constructor({ statusCode, code, message, fields }) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;

    if (fields) {
      this.fields = fields;
    }
  }
}
