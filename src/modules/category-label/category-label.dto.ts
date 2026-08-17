import { t } from "elysia";
import { CategoryType } from "../../constants/category.constant";

export const CreateCategoryDto = t.Object({
  name: t.String({ minLength: 1, maxLength: 60 }),
  type: t.Enum(CategoryType),
  icon: t.Optional(t.String()),
  color: t.Optional(t.String()),
  description: t.Optional(t.String()),
});

export const CreateLabelDto = t.Object({
  name: t.String({ minLength: 1, maxLength: 50 }),
  color: t.Optional(t.String()),
});

export type CreateCategoryInput = typeof CreateCategoryDto.static;
export type CreateLabelInput = typeof CreateLabelDto.static;
