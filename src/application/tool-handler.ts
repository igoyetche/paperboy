import type { SendToKindleService } from "../domain/send-to-kindle-service.js";
import type { DeviceRegistry } from "../domain/device-registry.js";
import { Title, Author, MarkdownContent } from "../domain/values/index.js";
import type { DomainError } from "../domain/errors.js";

// MCP SDK response type
interface McpToolResponse {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

function mapErrorToResponse(error: DomainError): McpToolResponse {
  let errorCode: string;
  switch (error.kind) {
    case "validation":
      errorCode = "VALIDATION_ERROR";
      break;
    case "size_limit":
      errorCode = "SIZE_ERROR";
      break;
    case "conversion":
      errorCode = "CONVERSION_ERROR";
      break;
    case "delivery":
      errorCode = "SMTP_ERROR";
      break;
    default: {
      const _exhaustive: never = error;
      errorCode = "UNKNOWN_ERROR";
      break;
    }
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: false,
          error: errorCode,
          details: error.message,
        }),
      },
    ],
    isError: true,
  };
}

/** Implements FR-3: MCP adapter that resolves device via DeviceRegistry before invoking service */
export class ToolHandler {
  constructor(
    private readonly service: Pick<SendToKindleService, "execute">,
    private readonly defaultAuthor: string,
    private readonly devices: DeviceRegistry,
  ) {}

  async handle(args: {
    title: string;
    content: string;
    author?: string;
    device?: string;
  }): Promise<McpToolResponse> {
    // Resolve device first
    const deviceResult = this.devices.resolve(args.device);
    if (!deviceResult.ok) return mapErrorToResponse(deviceResult.error);

    const titleResult = Title.create(args.title);
    if (!titleResult.ok) return mapErrorToResponse(titleResult.error);

    const contentResult = MarkdownContent.create(args.content);
    if (!contentResult.ok) return mapErrorToResponse(contentResult.error);

    const authorRaw = args.author?.trim() || this.defaultAuthor;
    const authorResult = Author.create(authorRaw);
    if (!authorResult.ok) return mapErrorToResponse(authorResult.error);

    const result = await this.service.execute(
      titleResult.value,
      contentResult.value,
      authorResult.value,
      deviceResult.value,
    );

    if (!result.ok) return mapErrorToResponse(result.error);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            message: `Document '${result.value.title}' sent to Kindle (${result.value.deviceName}) successfully.`,
            sizeBytes: result.value.sizeBytes,
          }),
        },
      ],
    };
  }
}
