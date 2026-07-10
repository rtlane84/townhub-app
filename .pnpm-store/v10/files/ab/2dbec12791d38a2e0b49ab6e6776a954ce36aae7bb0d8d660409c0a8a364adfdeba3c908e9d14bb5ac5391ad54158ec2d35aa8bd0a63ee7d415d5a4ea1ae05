import { Instrumentation } from '@opentelemetry/instrumentation';
import { PrismaInstrumentation } from './vendored/instrumentation';
interface PrismaOptions {
    /**
     * @deprecated This is no longer used, v5 works out of the box.
     */
    prismaInstrumentation?: Instrumentation;
    /**
     * Configuration passed through to the {@link PrismaInstrumentation} constructor.
     */
    instrumentationConfig?: ConstructorParameters<typeof PrismaInstrumentation>[0];
}
export declare const instrumentPrisma: ((options?: PrismaOptions | undefined) => Instrumentation<import("@opentelemetry/instrumentation").InstrumentationConfig>) & {
    id: string;
};
/**
 * Adds Sentry tracing instrumentation for the [prisma](https://www.npmjs.com/package/prisma) library.
 * For more information, see the [`prismaIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/prisma/).
 *
 * NOTE: This integration works out of the box with Prisma v6, and v7.
 * On Prisma versions prior to v6, add `previewFeatures = ["tracing"]` to the client generator block of your Prisma schema:
 *
 *    ```
 *    generator client {
 *      provider = "prisma-client-js"
 *      previewFeatures = ["tracing"]
 *    }
 *    ```
 */
export declare const prismaIntegration: (options?: PrismaOptions | undefined) => import("@sentry/core").Integration & {
    name: "Prisma";
};
export {};
//# sourceMappingURL=index.d.ts.map
