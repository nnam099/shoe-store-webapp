import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { errorHandler } from "../../src/middlewares/error-handler.js";
import { validate } from "../../src/middlewares/validate.js";
import { registerSchema } from "../../src/schemas/auth.schemas.js";

function createValidationApp() {
  const app = express();
  app.use(express.json());
  app.post("/register", validate(registerSchema), (httpRequest, response) => {
    response.status(200).json(httpRequest.body);
  });
  app.use(errorHandler);
  return app;
}

describe("request validation", () => {
  it("normalizes valid registration input", async () => {
    const response = await request(createValidationApp()).post("/register").send({
      fullName: "  Nguyễn An  ",
      email: "  AN@example.com  ",
      phone: "0901234567",
      password: "password123",
      passwordConfirmation: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.fullName).toBe("Nguyễn An");
    expect(response.body.email).toBe("an@example.com");
  });

  it("returns field errors without exposing internals", async () => {
    const response = await request(createValidationApp()).post("/register").send({
      fullName: "",
      email: "not-an-email",
      phone: "123",
      password: "short",
      passwordConfirmation: "different",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fields).toEqual(
      expect.objectContaining({
        fullName: expect.any(String),
        email: expect.any(String),
        phone: expect.any(String),
        password: expect.any(String),
        passwordConfirmation: expect.any(String),
      }),
    );
    expect(response.body).not.toHaveProperty("stack");
  });
});
