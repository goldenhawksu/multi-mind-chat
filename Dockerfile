# Multi-Mind Chat 智囊团 Dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制应用代码
COPY . .

# 构建前端应用
RUN npm run build

# 安装静态文件服务器
RUN npm install -g serve

# 暴露端口
EXPOSE 7860

# 设置运行时环境变量
ENV NODE_ENV=production
ENV PORT=7860

# 启动命令
CMD ["serve", "-s", "dist", "-l", "7860"]