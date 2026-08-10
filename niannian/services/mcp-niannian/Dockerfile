FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY niannian_tools.py mcp_server.py ./

ENV HOST=0.0.0.0
ENV PORT=8080
ENV NIANNIAN_BASE_URL=http://host.docker.internal:3000

EXPOSE 8080

CMD ["python", "mcp_server.py"]
