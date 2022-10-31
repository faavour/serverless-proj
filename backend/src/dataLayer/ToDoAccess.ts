import * as AWS from 'aws-sdk'
// import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from "../models/TodoItem";
import { TodoUpdate } from "../models/TodoUpdate";

const AWSXRay = require('aws-xray-sdk')
const XAWS = AWSXRay.captureAWS(AWS)

const s3 = new AWS.S3({
  signatureVersion: 'v4'
})

export const bucketName = process.env.S3_BUCKET_NAME
export const urlExpiration = process.env.SIGNED_URL_EXPIRATION || 60

// const logger = createLogger('TodosAccess')

// TODO: Implement the dataLayer logic

export class ToDoAccess {
  constructor(
    private readonly docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient(),
    private readonly todoTable = process.env.TODOS_TABLE
  ) { }

  async getAllToDos(userId: string): Promise<TodoItem[]> {
    console.log('Getting all todos')

    const result = await this.docClient
      .query({
        TableName: this.todoTable,
        KeyConditionExpression: '#userId = :userId',
        ExpressionAttributeNames: {
          '#userId': 'userId'
        },
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
      .promise()

    console.log(result)

    const items = result.Items

    return items as TodoItem[]
  }

  async createToDo(todoItem: TodoItem): Promise<TodoItem> {
    console.log('Creating new todo')

    const result = await this.docClient
      .put({
        TableName: this.todoTable,
        Item: todoItem
      })
      .promise()

    console.log(result)

    return todoItem
  }

  async updateToDoItem(
    todoUpdate: TodoUpdate,
    todoId: string,
    userId: string
  ): Promise<TodoUpdate> {
    console.log('Updating todo')

    const result = await this.docClient
      .update({
        TableName: this.todoTable,
        Key: {
          userId: userId,
          todoId: todoId
        },
        UpdateExpression:
          'SET #name = :name, #dueDate = :dueDate, #done = :done',
        ExpressionAttributeNames: {
          '#name': 'todoItemName',
          '#dueDate': 'ItemDueDate',
          '#done': 'itemStatus'
        },
        ExpressionAttributeValues: {
          ':name': todoUpdate['name'],
          ':dueDate': todoUpdate['dueDate'],
          ':done': todoUpdate['done']
        },

        ReturnValues: 'ALL_NEW'
      })
      .promise()

    console.log(result)

    const attributes = result.Attributes

    return attributes as TodoUpdate
  }

  async deleteToDoItem(todoId: string, userId: string): Promise<string> {
    console.log('Deleting todo')

    const result = await this.docClient
      .delete({
        TableName: this.todoTable,
        Key: {
          userId: userId,
          todoId: todoId
        }
      })
      .promise()

    console.log(result)

    return ''
  }

  async createAttachmentUrl(todoId: string): Promise<string> {
    let signedUrl: string;
    try {
      signedUrl = s3.getSignedUrl('putObject', {
        Bucket: bucketName,
        Key: todoId,
        Expires: +urlExpiration
      })
    } catch (error) {
      console.log("< ==== Error: ===== >\n", error.stack)
    }
    return signedUrl;
  }
}
