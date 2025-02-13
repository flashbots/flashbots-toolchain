## `Flashbots-toolchain` Github action

This Github action installs different tools from the Flashbots toolchain.

### Example workflow

```yaml
on: [push]

jobs:
  hello_world_job:
    runs-on: ubuntu-latest
    name: Suapp
    steps:
      - name: Install suave-geth
        uses: flashbots/flashbots-toolchain@v0.2
        with:
          suave-geth: latest
      - name: Which suave-geth
        run: suave-geth version
```

### Inputs

| **Name**             | **Required** | **Description**                                | **Type** |
| -------------------- | ------------ | ---------------------------------------------- | -------- |
| `suave-geth`         | No           | Version to install, e.g. `latest` or `v0.1.0`. | string   |
| `builder-playground` | No           | Version to install, e.g. `latest` or `v0.1.0`. | string   |
| `reth`               | No           | Version to install, e.g. `latest` or `v0.1.0`. | string   |
| `op-reth`            | No           | Version to install, e.g. `latest` or `v0.1.0`. | string   |
