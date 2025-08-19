FROM rust:latest

RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    pkg-config \
    git \
    libgirepository1.0-dev \
    libglib2.0-dev \
    libgtk-3-dev \
    libgdk-pixbuf2.0-dev \
    libcairo2-dev \
    libpango1.0-dev \
    libatk1.0-dev \
    libwebkit2gtk-4.0-dev \
    libwebkit2gtk-4.1-dev \
    libjavascriptcoregtk-4.1-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN rustup component add rustfmt clippy
