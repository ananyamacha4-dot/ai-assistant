from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)

from peft import (
    LoraConfig,
    get_peft_model
)

# Load dataset
dataset = load_dataset(
    "json",
    data_files="training_data/data.jsonl"
)

# Small model
model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

# Tokenizer
tokenizer = AutoTokenizer.from_pretrained(
    model_name
)

tokenizer.pad_token = tokenizer.eos_token

# Model
model = AutoModelForCausalLM.from_pretrained(
    model_name
)

# Convert text into tokens
def tokenize(example):

    text = (
        f"User: {example['prompt']}\n"
        f"Assistant: {example['response']}"
    )

    return tokenizer(
        text,
        truncation=True,
        padding="max_length",
        max_length=128
    )

# Tokenize dataset
tokenized_dataset = dataset["train"].map(
    tokenize
)

# LoRA config
lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

# Apply LoRA
model = get_peft_model(
    model,
    lora_config
)

# Training settings
training_args = TrainingArguments(
    output_dir="./finetuned_model",
    per_device_train_batch_size=1,
    num_train_epochs=1,
    logging_steps=1,
    save_steps=10
)

# Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
    data_collator=DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False
    )
)

# Train model
trainer.train()

# Save model
model.save_pretrained(
    "./finetuned_model"
)

tokenizer.save_pretrained(
    "./finetuned_model"
)

print("Training completed!")