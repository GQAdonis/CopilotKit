import { CreateChatCompletionMutation, MessageInput, MessageStatusCode } from "../graphql/@generated/graphql";
import { ActionExecutionMessage, Message, ResultMessage, TextMessage } from "./conversion.types";
import untruncateJson from "untruncate-json";
import { plainToInstance } from "class-transformer";

export function convertMessagesToGqlInput(messages: Message[]): MessageInput[] {
  return messages.map((message) => {
    if (message instanceof TextMessage) {
      return {
        id: message.id,
        createdAt: message.createdAt,
        textMessage: {
          content: message.content,
          role: message.role as any,
        },
      };
    } else if (message instanceof ActionExecutionMessage) {
      return {
        id: message.id,
        createdAt: message.createdAt,
        actionExecutionMessage: {
          name: message.name,
          arguments: JSON.stringify(message.arguments),
          scope: message.scope as any,
        },
      };
    } else if (message instanceof ResultMessage) {
      return {
        id: message.id,
        createdAt: message.createdAt,
        resultMessage: {
          result: message.result,
          actionExecutionId: message.actionExecutionId,
          actionName: message.actionName,
        },
      };
    } else {
      throw new Error("Unknown message type");
    }
  });
}

export function convertGqlOutputToMessages(
  messages: CreateChatCompletionMutation["createChatCompletion"]["messages"],
): Message[] {
  return messages.map((message) => {
    if (message.__typename === "TextMessageOutput") {
      return plainToInstance(TextMessage, {
        id: message.id,
        role: message.role,
        content: message.content.join(""),
        createdAt: new Date(),
        status: message.status || { code: MessageStatusCode.Pending }
      });
    } else if (message.__typename === "ActionExecutionMessageOutput") {
      return plainToInstance(ActionExecutionMessage, {
        id: message.id,
        name: message.name,
        arguments: getPartialArguments(message.arguments),
        scope: message.scope,
        createdAt: new Date(),
        status: message.status || { code: MessageStatusCode.Pending }
      });
    } else if (message.__typename === "ResultMessageOutput") {
      return plainToInstance(ResultMessage, {
        id: message.id,
        result: message.result,
        actionExecutionId: message.actionExecutionId,
        actionName: message.actionName,
        createdAt: new Date(),
        status: message.status || { code: MessageStatusCode.Pending }
      });
    }

    throw new Error("Unknown message type");
  });
}

function getPartialArguments(args: string[]) {
  try {
    return JSON.parse(untruncateJson(args.join("")));
  } catch (e) {
    return {};
  }
}