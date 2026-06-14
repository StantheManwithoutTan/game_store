# FROM python:3.12
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "import dotenv; print('DOTENV OK')"

COPY . .

EXPOSE 5000

CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]

# RUN apt-get update && apt-get install -y bash

#CMD ["flask", "run", "--host=0.0.0.0"]