// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandOutput,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import { Product } from '../../model/product';
import { ProductStore } from '../product-store';

export class DynamoDbStore implements ProductStore {
  private static tableName = process.env.SAMPLE_TABLE;
  private static ddbClient: DynamoDBClient = captureAWSv3Client(
    new DynamoDBClient({
      region: process.env.REGION,
    })
  );
  //private static ddbClient: DynamoDBClient = new DynamoDBClient({});
  private static ddbDocClient: DynamoDBDocumentClient =
    DynamoDBDocumentClient.from(DynamoDbStore.ddbClient);

  public async getProduct(id: string): Promise<Product | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: DynamoDbStore.tableName,
      Key: {
        id: id,
      },
    });
    const result: GetCommandOutput = await DynamoDbStore.ddbDocClient.send(
      params
    );
    return result.Item as Product;
  }

  public async putProduct(product: Product): Promise<void> {
    const params: PutCommand = new PutCommand({
      TableName: DynamoDbStore.tableName,
      Item: {
        id: product.id,
        name: product.name,
        price: product.price,
      },
    });
    await DynamoDbStore.ddbDocClient.send(params);
  }

  public async deleteProduct(id: string): Promise<void> {
    const params: DeleteCommand = new DeleteCommand({
      TableName: DynamoDbStore.tableName,
      Key: {
        id: id,
      },
    });
    await DynamoDbStore.ddbDocClient.send(params);
  }

  public async getProducts(): Promise<Product[] | undefined> {
    const params: ScanCommand = new ScanCommand({
      TableName: DynamoDbStore.tableName,
      Limit: 20,
    });
    const result = await DynamoDbStore.ddbDocClient.send(params);
    return result.Items as Product[];
  }
}
