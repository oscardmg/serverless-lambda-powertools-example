import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ hello: 'hello world' }),
  };
};
