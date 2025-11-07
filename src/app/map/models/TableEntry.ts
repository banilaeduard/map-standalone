export interface TableEntry {
    id?: number;
    partitionKey: string;
    rowKey: string;
    tableName?: string;
    entitytype?:string;
}