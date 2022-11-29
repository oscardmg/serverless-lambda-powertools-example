import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { logMetrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { DynamoDbStore } from '../lib/dynamodb/dynamodb-store';
import { ProductStore } from '../lib/product-store';
import { logger, metrics, tracer } from '../util/powertools';

const store: ProductStore = new DynamoDbStore();

const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Tracer: Get facade segment created by AWS Lambda
  const segment = tracer.getSegment();

  // Tracer: Create subsegment for the function & set it as active
  const handlerSegment = segment.addNewSubsegment(`## ${process.env._HANDLER}`);
  tracer.setSegment(handlerSegment);

  logger.appendKeys({
    resource_path: event.requestContext.resourcePath,
  });

  tracer.annotateColdStart();
  tracer.addServiceNameAnnotation();

  // Tracer: Add annotation for the awsRequestId
  tracer.putAnnotation('awsRequestId', context.awsRequestId);

  // Metrics: Capture cold start metrics
  metrics.captureColdStartMetric();

  // Logger: Add persistent attributes to each log statement
  logger.addPersistentLogAttributes({
    awsRequestId: context.awsRequestId,
  });

  let response;
  try {
    const result = await store.getProducts();

    logger.info('Products retrieved', { details: { products: result } });
    metrics.addMetric('productsRetrieved', MetricUnits.Count, 1);

    response = {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: `{"products":${JSON.stringify(result)}}`,
    };
  } catch (error) {
    tracer.addErrorAsMetadata(error as Error);
    logger.error('Error reading from table. ' + error);
    logger.error(
      'Unexpected error occurred while trying to retrieve products',
      error as Error
    );

    response = {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(error),
    };
  }

  // Tracer: Close subsegment (the AWS Lambda one is closed automatically)
  handlerSegment.close(); // (## index.handler)

  // Tracer: Set the facade segment as active again (the one created by AWS Lambda)
  tracer.setSegment(segment);

  // All log statements are written to CloudWatch
  logger.info(
    `response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`
  );

  return response;
};

const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics, { captureColdStartMetric: true }))
  .use(injectLambdaContext(logger, { clearState: true, logEvent: true }));

export { handler };
