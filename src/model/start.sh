#!/bin/bash

sudo docker build -t model .

sudo docker run -p 8000:8000 model