import yaml
import os

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../config.yaml")

def load_config():
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)

def get_model_name():
    return load_config()["llm"]["model_name"]

def get_llm_host():
    return load_config()["llm"]["host"]

def get_vlm_model_name():
    return load_config()["vlm"]["model_name"]

def get_vlm_host():
    return load_config()["vlm"]["host"]
