# ============================================================
# 1. Automated feature importance analysis (RF + XGB)
# ============================================================
import os
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def analyze_feature_importance_from_files():
    models = {}

    # === Load RandomForest model ===
    if os.path.exists("model_rf.joblib") and os.path.exists("model_rf_features.joblib"):
        try:
            model_rf = joblib.load("model_rf.joblib")
            features_rf = joblib.load("model_rf_features.joblib")
            models["RandomForest"] = (model_rf, features_rf)
            print("RandomForest model loaded.")
        except Exception as e:
            print(f"Could not load RandomForest: {e}")
    else:
        print("RandomForest files not found.")

    # === Load XGBoost model ===
    if os.path.exists("model.joblib") and os.path.exists("model_features.joblib"):
        try:
            model_xgb = joblib.load("model.joblib")
            features_xgb = joblib.load("model_features.joblib")
            models["XGBoost"] = (model_xgb, features_xgb)
            print("XGBoost model loaded.")
        except Exception as e:
            print(f"Could not load XGBoost: {e}")
    else:
        print("XGBoost files not found.")

    if not models:
        print("No models were found.")
        return

    # === Display feature importances ===
    all_importances = {}

    for name, (model, features) in models.items():
        if not hasattr(model, "feature_importances_"):
            print(f"Model {name} does not expose feature_importances_; skipping.")
            continue

        df_imp = (
            pd.DataFrame({
                "feature": features,
                "importance": model.feature_importances_,
            })
            .sort_values("importance", ascending=False)
            .reset_index(drop=True)
        )

        all_importances[name] = df_imp
        print(f"\nTop 10 features for {name}:")
        for i, row in df_imp.head(10).iterrows():
            print(f"   {row['feature']:<25} {row['importance']:.4f}")

    # === Build a comparative chart ===
    if not all_importances:
        print("No model provides importances.")
        return

    merged = pd.DataFrame()
    for name, df_imp in all_importances.items():
        tmp = df_imp.set_index("feature")["importance"].rename(name)
        merged = merged.join(tmp, how="outer") if not merged.size else merged.join(tmp, how="outer")

    merged = merged.fillna(0)
    top_features = merged.mean(axis=1).sort_values(ascending=False).head(10)
    merged = merged.loc[top_features.index]

    # === Comparative chart ===
    plt.figure(figsize=(8, 5))
    bar_width = 0.4
    y_pos = np.arange(len(merged))

    if "RandomForest" in merged.columns:
        plt.barh(y_pos - bar_width/2, merged["RandomForest"], bar_width, label="RandomForest", color="#3CB371")
    if "XGBoost" in merged.columns:
        plt.barh(y_pos + bar_width/2, merged["XGBoost"], bar_width, label="XGBoost", color="#1E90FF")

    plt.yticks(y_pos, merged.index)
    plt.xlabel("Feature Importance")
    plt.title("Feature Importance Comparison (RF vs XGBoost)")
    plt.legend()
    plt.tight_layout()
    out_path = "plots/feature_importance.png"
    plt.tight_layout()
    plt.savefig(out_path, dpi=200, bbox_inches="tight")
    print(f"Saved plot to: {out_path}")



# Call this only once:
if __name__ == "__main__":
    analyze_feature_importance_from_files()
