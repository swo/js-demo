import json

import numpy as np
import polars as pl

precision = 2

data = (
    pl.DataFrame(
        # use axial coordinates
        [(q, r) for q in range(6) for r in range(6)],
        schema=["q", "r"],
        orient="row",
    )
    .with_row_index("id")
    .with_columns(
        # get the centers for each hexagon
        x0=np.sqrt(3.0) * pl.col("q") + np.sqrt(3.0) / 2.0 * pl.col("r"),
        y0=3.0 / 2 * pl.col("r"),
    )
    .with_columns(
        order=list(range(6)),
        x=list(np.sin(np.linspace(0.0, 2 * np.pi, 7)[:-1])),
        y=list(np.cos(np.linspace(0.0, 2 * np.pi, 7)[:-1])),
    )
    .with_columns(pl.col("x") + pl.col("x0"), pl.col("y") + pl.col("y0"))
    # ensure all points are visible
    .explode(["order", "x", "y"])
    .with_columns(pl.col("x0") - pl.col("x").min(), pl.col("y0") - pl.col("y").min())
    .with_columns(pl.col("x") - pl.col("x").min(), pl.col("y") - pl.col("y").min())
)

print("Max x:", data.select(pl.col("x").max()).item())
print("Max y:", data.select(pl.col("y").max()).item())


hex_data = (
    data.with_columns(pl.col(["x", "y"]).round(precision))
    .with_columns(points=pl.concat_str(["x", "y"], separator=","))
    .with_columns(id=pl.concat_str(["q", "r"], separator=","))
    .sort("id", "order")
    .group_by("id", "x0", "y0")
    .agg(pl.col("points"))
    .with_columns(pl.col("points").list.join(" "))
)

output = "export default " + json.dumps(list(hex_data.iter_rows(named=True)), indent=2)

with open("src/data/state-hex.tsx", "w") as f:
    f.write(output)
