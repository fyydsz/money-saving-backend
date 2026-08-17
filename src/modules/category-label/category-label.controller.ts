import { Elysia } from "elysia";
import { authGuard } from "../../plugins/auth.plugin";
import { CategoryLabelService } from "./category-label.service";
import { CreateCategoryDto, CreateLabelDto } from "./category-label.dto";

const service = new CategoryLabelService();

export const categoryLabelController = new Elysia()
  .use(authGuard)
  // Categories (Public get list with fallback, or user customized)
  .get("/categories", async ({ user }: any) => {
    return await service.getCategories(user?.id);
  })
  // Protected routes for categories & labels
  .guard({ isAuth: true }, (app) =>
    app
      .post(
        "/categories",
        async ({ user, body, set }: any) => {
          try {
            const category = await service.createCategory(user.id, body);
            set.status = 201;
            return {
              message: "Category created successfully",
              category,
            };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        { body: CreateCategoryDto }
      )
      .delete("/categories/:id", async ({ user, params: { id }, set }: any) => {
        try {
          return await service.deleteCategory(user.id, id);
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
      .get("/labels", async ({ user, set }: any) => {
        try {
          const labels = await service.getLabels(user.id);
          return { labels };
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
      .post(
        "/labels",
        async ({ user, body, set }: any) => {
          try {
            const label = await service.createLabel(user.id, body);
            set.status = 201;
            return {
              message: "Label saved successfully",
              label,
            };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        { body: CreateLabelDto }
      )
      .delete("/labels/:id", async ({ user, params: { id }, set }: any) => {
        try {
          return await service.deleteLabel(user.id, id);
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
  );
