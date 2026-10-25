from .nodes import LoRAPlotNode, LoRAPlotImageSaver

NODE_CLASS_MAPPINGS = {
    "LoRAPlotNode": LoRAPlotNode,
    "LoRAPlotImageSaver": LoRAPlotImageSaver
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LoRAPlotNode": "LoRA Plot Node Unlimited",
    "LoRAPlotImageSaver": "LoRA Plot Image Saver Unlimited"
}

WEB_DIRECTORY = "./web"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']

