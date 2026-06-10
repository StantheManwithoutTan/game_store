FROM python:3.12

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "import dotenv; print('DOTENV OK')"

COPY . .

RUN apt-get update && apt-get install -y bash

CMD ["flask", "run", "--host=0.0.0.0"]