import { Elysia, t } from "elysia";
import { authGuard } from "../../plugins/auth.plugin";
import { VaultService } from "./vault.service";
import { CreateVaultDto, UpdateVaultDto } from "./vault.dto";

const vaultService = new VaultService();

export const vaultController = new Elysia({ prefix: "/vaults" })
  .use(authGuard)
  // Presets endpoint (public/authenticated)
  .get("/presets", () => {
    return {
      presets: vaultService.getPresets(),
    };
  })
  // Protected endpoints
  .guard({ isAuth: true }, (app) =>
    app
      .get("/", async ({ user, set }: any) => {
        try {
          const result = await vaultService.getUserVaults(user.id);
          return result;
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
      .get("/:id", async ({ user, params: { id }, set }: any) => {
        try {
          const vault = await vaultService.getVaultById(user.id, id);
          return { vault };
        } catch (err: any) {
          set.status = 404;
          return { error: err.message };
        }
      })
      .post(
        "/",
        async ({ user, body, set }: any) => {
          try {
            const vault = await vaultService.createVault(user.id, body);
            set.status = 201;
            return {
              message: "Vault created successfully",
              vault,
            };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: CreateVaultDto,
        }
      )
      .put(
        "/:id",
        async ({ user, params: { id }, body, set }: any) => {
          try {
            const vault = await vaultService.updateVault(user.id, id, body);
            return {
              message: "Vault updated successfully",
              vault,
            };
          } catch (err: any) {
            set.status = 400;
            return { error: err.message };
          }
        },
        {
          body: UpdateVaultDto,
        }
      )
      .delete("/:id", async ({ user, params: { id }, set }: any) => {
        try {
          const result = await vaultService.deleteVault(user.id, id);
          return result;
        } catch (err: any) {
          set.status = 400;
          return { error: err.message };
        }
      })
  );
