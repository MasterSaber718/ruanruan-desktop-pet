import mongoose from 'mongoose';

class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('MongoDB 已经连接');
      return;
    }

    try {
      // 从环境变量获取 MongoDB 连接字符串
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ruanlinyun-ai';
      
      await mongoose.connect(mongoURI);

      this.isConnected = true;
      console.log('MongoDB 连接成功');
    } catch (error) {
      console.error('MongoDB 连接失败:', error);
      throw error;
    }
  }

  public disconnect(): void {
    if (this.isConnected) {
      mongoose.disconnect();
      this.isConnected = false;
      console.log('MongoDB 连接已断开');
    }
  }

  public getConnection() {
    return mongoose.connection;
  }
}

export default Database.getInstance();
